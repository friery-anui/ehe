// modules/fishing.js

const fishTypes = [
  { name: 'Cá Con', minWeight: 0.1, maxWeight: 0.5, minPrice: 100, maxPrice: 500, probability: 0.4 },
  { name: 'Cá Nhỏ', minWeight: 0.5, maxWeight: 1, minPrice: 500, maxPrice: 800, probability: 0.3 },
  { name: 'Cá Vừa', minWeight: 1, maxWeight: 2, minPrice: 800, maxPrice: 1500, probability: 0.2 },
  { name: 'Cá Lớn', minWeight: 2, maxWeight: 5, minPrice: 1500, maxPrice: 3000, probability: 0.05 },
  { name: 'Cá Mập', minWeight: 5, maxWeight: 10, minPrice: 5000, maxPrice: 10000, probability: 0.05 },
];

function getRandomFish() {
  const rand = Math.random();
  let cumulative = 0;
  for (const fish of fishTypes) {
    cumulative += fish.probability;
    if (rand <= cumulative) return fish;
  }
  return fishTypes[0];
}

function catchFish() {
  const success = Math.random() > 0.15;
  if (!success) return { success: false, message: 'Ôi Không!! Cá Chạy Mất Rồi 😱' };

  const fish = getRandomFish();
  const weight = parseFloat((Math.random() * (fish.maxWeight - fish.minWeight) + fish.minWeight).toFixed(2));
  const price = Math.floor(Math.random() * (fish.maxPrice - fish.minPrice) + fish.minPrice);
  return {
    success: true,
    message: `Cá Đã Cắn Câu! 🐠\nCá Của Bạn: **${fish.name}** (${weight}kg, ${price} Fish Coins)`,
    fish: { name: fish.name, weight, price }
  };
}

module.exports = {
  fishTypes,
  catchFish
};