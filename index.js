
const { fishTypes, catchFish } = require('./modules/fishing');
const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { Player } = require('discord-player');
const axios = require('axios');
const cron = require('node-cron');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

const player = new Player(client);
let lastUpdateHash = null;

client.once('ready', async () => {
  console.log(`Đăng nhập thành công với ${client.user.tag}`);
  client.user.setActivity('/cauca | /fishp', { type: 'PLAYING' });

  const ticketChannel = client.channels.cache.get('1367588092516765806');
  if (ticketChannel) {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🎫 -TICKET')
      .setDescription('Để tạo ticket bạn vui lòng nhấn 📩')
      .setFooter({ text: 'Fishwork - Ticketing without clutter' });

    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('📩 Create ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);
    await ticketChannel.send({ embeds: [embed], components: [row] });
  }

  const commands = [
    { name: 'cauca', description: 'Câu cá và thử vận may của bạn!' },
    { name: 'balo', description: 'Kiểm tra kho cá và số Fish Coins của bạn' },
    {
      name: 'banca', description: 'Bán cá để nhận Fish Coins',
      options: [{ name: 'loai_ca', description: 'Loại cá muốn bán', type: 3, required: true, choices: fishTypes.map(f => ({ name: f.name, value: f.name })) }]
    },
    { name: 'cuahang', description: 'Mở cửa hàng để mua cúp thành tựu' },
    { name: 'bxh', description: 'Xem bảng xếp hạng người có nhiều Fish Coins nhất' },
    {
      name: 'nimage', description: 'Đăng tải ảnh (chỉ dành cho quản lý)',
      options: [{ name: 'image', description: 'File ảnh cần đăng', type: 11, required: true }]
    },
    {
      name: 'fishp', description: 'Phát nhạc từ YouTube',
      options: [{ name: 'song', description: 'Tên bài hát hoặc link YouTube', type: 3, required: true }]
    },
    { name: 'fskip', description: 'Chuyển sang bài hát tiếp theo trong danh sách' },
    { name: 'fstop', description: 'Dừng phát nhạc và rời kênh thoại' },
    { name: 'fpause', description: 'Tạm dừng nhạc đang phát' },
    { name: 'fcon', description: 'Tiếp tục phát nhạc' },
  ];

  const guild = client.guilds.cache.get('771016561795530823');
  if (guild) await guild.commands.set(commands);

  cron.schedule('*/5 * * * *', checkWebsiteUpdates);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'create_ticket') {
    const categoryId = '1367599381276135555';
    const roleIds = ['1367571808416563323', '1367573962279620730', '1367567761408135290', '1367576683099717713'];

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ...roleIds.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }))
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('Đóng Ticket').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('delete_ticket').setLabel('Xoá Ticket').setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ content: `Ticket được tạo bởi ${interaction.user}!`, components: [row] });
    await interaction.reply({ content: `Ticket đã được tạo: ${channel}`, ephemeral: true });
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'close_ticket') {
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: false });
      await interaction.reply({ content: 'Ticket đã được đóng!', ephemeral: true });
    }
    if (interaction.customId === 'delete_ticket') {
      const allowedRoles = ['1367571808416563323', '1367573962279620730', '1367567761408135290', '1367576683099717713'];
      if (interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
        await interaction.channel.delete();
      } else {
        await interaction.reply({ content: 'Bạn không có quyền xoá ticket này!', ephemeral: true });
      }
    }
  }

  if (interaction.isCommand()) {
    const { commandName } = interaction;
    const userId = interaction.user.id;

    if (commandName === 'cauca') {
      await interaction.reply('🎣 Đang thả câu...');

      setTimeout(async () => {
        const result = catchFish();
        console.log('🎣 Kết quả câu cá:', result);

        let finalMessage = `🎣 Ném Cần Câu
👀 Tập Trung Quan Sát`;

        if (!result.success) {
          finalMessage += `
❌ ${result.message}`;
          return interaction.editReply(finalMessage);
        }

        try {
          let inventory = db.get(`inventory.${userId}.fish`) || [];
          inventory.push(result.fish);
          db.set(`inventory.${userId}.fish`, inventory);
          db.add(`inventory.${userId}.fishCoins`, result.fish.price);
          finalMessage += `
✅ ${result.message}`;
        } catch (err) {
          console.error('❗ Lỗi khi ghi vào DB:', err);
          finalMessage += '\n⚠️ Đã câu được cá nhưng lỗi khi lưu dữ liệu!';
        }

        await interaction.editReply(finalMessage);
      }, 5000);
    }

    if (commandName === 'balo') {
      const inventory = db.get(`inventory.${userId}.fish`) || [];
      const fishCoins = db.get(`inventory.${userId}.fishCoins`) || 0;
      if (inventory.length === 0) return interaction.reply('Balo của bạn trống rỗng!');
      const list = inventory.map((f, i) => `${i + 1}. ${f.name} (${f.weight}kg, ${f.price} Coins)`).join('\n');
      interaction.reply(`**Balo Cá**\n${list}\n**Fish Coins**: ${fishCoins}`);
    }

    if (commandName === 'banca') {
      const name = interaction.options.getString('loai_ca');
      const inv = db.get(`inventory.${userId}.fish`) || [];
      const selected = inv.filter(f => f.name === name);
      if (selected.length === 0) return interaction.reply(`Bạn không có **${name}**!`);
      const coins = selected.reduce((sum, f) => sum + f.price, 0);
      db.set(`inventory.${userId}.fish`, inv.filter(f => f.name !== name));
      db.add(`inventory.${userId}.fishCoins`, coins);
      interaction.reply(`Đã bán ${selected.length} **${name}** và nhận được ${coins} Fish Coins!`);
    }

    if (commandName === 'cuahang') {
      const coins = db.get(`inventory.${userId}.fishCoins`) || 0;
      if (coins < 1000000) return interaction.reply('Bạn cần 1,000,000 Fish Coins để mua cúp **Fishing God**!');
      db.subtract(`inventory.${userId}.fishCoins`, 1000000);
      db.push(`inventory.${userId}.achievements`, 'Fishing God', false);
      interaction.reply('Chúc mừng! Bạn đã mua cúp **Fishing God**!');
    }

    if (commandName === 'bxh') {
      const data = db.all().filter(entry => entry.ID.endsWith('.fishCoins'));
      const sorted = data.sort((a, b) => b.data - a.data).slice(0, 10);
      const embed = new EmbedBuilder()
        .setTitle('🏆 BẢNG XẾP HẠNG FISH COINS')
        .setColor('Gold')
        .setDescription(sorted.map((entry, i) => `**${i + 1}.** <@${entry.ID.split('.')[1]}> — ${entry.data} Coins`).join('\n'));
      interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'nimage') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({ content: 'Chỉ quản lý mới có thể sử dụng!', ephemeral: true });
      const img = interaction.options.getAttachment('image');
      if (!img.contentType.startsWith('image/')) return interaction.reply({ content: 'File không phải ảnh!', ephemeral: true });
      await interaction.channel.send({ files: [img] });
      interaction.reply({ content: 'Ảnh đã được đăng!', ephemeral: true });
    }
  }
});

async function checkWebsiteUpdates() {
  try {
    const res = await axios.get('https://minemelon.cloud/');
    const hash = require('crypto').createHash('md5').update(res.data).digest('hex');
    if (lastUpdateHash && hash !== lastUpdateHash) {
      const notifyChannel = client.channels.cache.get('1367582745022304376');
      if (notifyChannel) notifyChannel.send('🌐 **Cập nhật mới trên https://minemelon.cloud/**! Kiểm tra ngay!');
    }
    lastUpdateHash = hash;
  } catch (e) {
    console.error('Lỗi kiểm tra website:', e);
  }
}

client.login(process.env.TOKEN);
