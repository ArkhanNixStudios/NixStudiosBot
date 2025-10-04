const items = {
    MATERIAL: {
        leaf: { name: "Daun", price: 3 },
        wool: { name: "Wol", price: 5 },
        bone: { name: "Tulang", price: 5 },
        wood: { name: "Kayu", price: 10 },
        stick: { name: "Stik", price: 5 },
        stone: { name: "Batu", price: 15 },
        iron: { name: "Besi", price: 50 },
        gold: { name: "Emas", price: 100 },
        diamond: { name: "Berlian", price: 500 },
        obsidian: { name: "Obsidian", price: 750 },
        crystal: { name: "Kristal Ajaib", price: 1200 },
        ruby: { name: "Ruby", price: 1500 },
        netherite: { name: "Netherite", price: 2500 },
        sapphire: { name: "Sapphire", price: 1700 },
        emerald: { name: "Emerald", price: 2000 }
    },
    TOOLS: {
        pickaxe: { name: "Cangkul", price: 100 },
        axe: { name: "Kapak", price: 150 },
        torch: { name: "Obor", price: 50 },
        boat: { name: "Kapal", price: 50 },
        fishing_rod: { name: "Pancing", price: 250 },
        shovel: { name: "Sekop", price: 80 },
        bucket: { name: "Ember", price: 100 }
    },
    WEAPONS: {
        wooden_sword: { name: "Pedang Kayu", price: 150 },
        iron_sword: { name: "Pedang Besi", price: 700 },
        diamond_sword: { name: "Pedang Berlian", price: 5000 },
        netherite_sword: { name: "Pedang Netherite", price: 6000 },
        fire_sword: { name: "Pedang Api", price: 8000 },
        ice_sword: { name: "Pedang Es", price: 8500 },
        thunder_sword: { name: "Pedang Petir", price: 9000 },
        blood_sword: { name: "Pedang Darah", price: 10000 },
        dragon_slayer: { name: "Pembunuh Naga", price: 20000 }
    },
    ARMOR: {
        iron_armor: { name: "Armor Besi", price: 2000 },
        diamond_armor: { name: "Armor Berlian", price: 10000 },
        fire_armor: { name: "Armor Api", price: 12000 },
        ice_armor: { name: "Armor Es", price: 12500 },
        dragon_armor: { name: "Armor Naga", price: 25000 }
    },
    BOWS_ARROWS: {
        wooden_bow: { name: "Busur Kayu", price: 500 },
        iron_bow: { name: "Busur Besi", price: 1500 },
        diamond_bow: { name: "Busur Berlian", price: 6000 },
        fire_arrow: { name: "Anak Panah Api", price: 1200 },
        ice_arrow: { name: "Anak Panah Es", price: 1500 },
        thunder_arrow: { name: "Anak Panah Petir", price: 1800 }
    },
    FOOD: {
        apple: { name: "Apel", price: 30 },
        bread: { name: "Roti", price: 50 },
        golden_apple: { name: "Apel Emas", price: 500 },
        steak: { name: "Daging Panggang", price: 200 },
        fish: { name: "Ikan", price: 100 },
        dragon_meat: { name: "Daging Naga", price: 5000 }
    },
    POTIONS: {
        health_potion: { name: "Ramuan Penyembuh", price: 300 },
        mana_potion: { name: "Ramuan Mana", price: 350 },
        stamina_potion: { name: "Ramuan Stamina", price: 400 },
        poison_potion: { name: "Ramuan Racun", price: 1000 },
        invisibility_potion: { name: "Ramuan Gaib", price: 5000 }
    },
    RARE_ITEMS: {
        dragon_eye: { name: "Mata Naga", price: 50000 },
        magic_scroll: { name: "Gulungan Sihir", price: 20000 },
        phoenix_feather: { name: "Bulu Phoenix", price: 35000 },
        ancient_tome: { name: "Kitab Kuno", price: 75000 },
        time_crystal: { name: "Kristal Waktu", price: 100000 },
        demon_heart: { name: "Hati Iblis", price: 250000 }
    },
    QUEST_ITEMS: {
        treasure_map: { name: "Peta Harta Karun", price: 15000 },
        cursed_gem: { name: "Permata Terkutuk", price: 5000 },
        pirate_coin: { name: "Koin Bajak Laut", price: 7000 },
        king_seal: { name: "Segel Raja", price: 25000 },
        moonstone: { name: "Batu Bulan", price: 40000 }
    },
    ILLEGAL: {
        kontol: { name: "Kontol", price: 99000 },
        bedrock: { name: "Bedrock", price: 500000 }
    }
};

module.exports = items;