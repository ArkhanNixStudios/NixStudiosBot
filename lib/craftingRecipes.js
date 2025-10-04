const craftingRecipes = {
    // ⚒️ TOOLS / PERALATAN
    pickaxe: { wood: 3, stick: 2 },
    axe: { wood: 3, stick: 2 },
    torch: { stick: 1, coal: 1 },
    boat: { wood: 5 },
    fishing_rod: { stick: 3, wool: 2 },
    shovel: { wood: 1, stick: 2 },
    bucket: { iron: 3 },

    // ⚔️ SENJATA
    wooden_sword: { wood: 2, stick: 1 },
    iron_sword: { iron: 2, stick: 1 },
    diamond_sword: { diamond: 2, stick: 1 },
    netherite_sword: { netherite: 2, stick: 1 },
    fire_sword: { iron: 1, fire_essence: 2, stick: 1 },
    ice_sword: { iron: 1, ice_essence: 2, stick: 1 },
    thunder_sword: { iron: 1, thunder_essence: 2, stick: 1 },
    blood_sword: { iron: 1, demon_heart: 1, stick: 1 },
    dragon_slayer: { dragon_eye: 1, netherite: 5, stick: 2 },

    // 🏕️ ARMOR
    iron_armor: { iron: 8 },
    diamond_armor: { diamond: 8 },
    fire_armor: { iron_armor: 1, fire_essence: 3 },
    ice_armor: { iron_armor: 1, ice_essence: 3 },
    dragon_armor: { dragon_eye: 2, netherite: 8 },

    // 🎯 PANAH
    wooden_bow: { stick: 3, wool: 2 },
    iron_bow: { stick: 3, iron: 2, wool: 1 },
    diamond_bow: { stick: 3, diamond: 2, wool: 1 },
    fire_arrow: { stick: 1, fire_essence: 1, feather: 1 },
    ice_arrow: { stick: 1, ice_essence: 1, feather: 1 },
    thunder_arrow: { stick: 1, thunder_essence: 1, feather: 1 },

    // 🍷 POTION
    health_potion: { leaf: 5, bottle: 1 },
    mana_potion: { crystal: 1, bottle: 1 },
    stamina_potion: { leaf: 3, bread: 1, bottle: 1 },
    poison_potion: { mushroom: 3, bottle: 1 },
    invisibility_potion: { phantom_membrane: 1, bottle: 1 },

    // 🔮 BARANG LANGKA
    dragon_eye: { fire_essence: 3, crystal: 2 },
    magic_scroll: { paper: 3, ink: 1 },
    phoenix_feather: { fire_essence: 5, wool: 3 },
    ancient_tome: { paper: 5, ink: 2 },
    time_crystal: { crystal: 5, diamond: 2 },
    demon_heart: { blood_sword: 1, fire_essence: 5 },

    // 📜 ITEM QUEST
    treasure_map: { paper: 3, ink: 1 },
    cursed_gem: { ruby: 1, obsidian: 1 },
    pirate_coin: { gold: 2 },
    king_seal: { gold: 5, paper: 1 },
    moonstone: { sapphire: 2, crystal: 3 }
};

module.exports = craftingRecipes;