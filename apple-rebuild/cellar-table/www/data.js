/* Cellar & Table — reference data (all local, no network) */
window.CT_DATA = (function () {
  var TYPES = {
    red:       { label: 'Red',       color: '#a3243b' },
    white:     { label: 'White',     color: '#e6d27a' },
    rose:      { label: 'Rosé',      color: '#f0a3a8' },
    sparkling: { label: 'Sparkling', color: '#c9dde6' },
    dessert:   { label: 'Dessert',   color: '#e09a2c' },
    fortified: { label: 'Fortified', color: '#8a4a22' },
    orange:    { label: 'Orange',    color: '#e0733a' }
  };
  // years after vintage: [window opens, window closes]
  var RULES = { red: [3, 12], white: [1, 5], rose: [0, 2], sparkling: [1, 6], dessert: [3, 20], fortified: [5, 40], orange: [1, 6] };

  var STYLES = {
    'bold-red':       { label: 'Bold red',        eg: 'Cabernet, Syrah, Malbec, Nebbiolo', why: 'firm tannin and dark fruit stand up to rich, savoury food' },
    'medium-red':     { label: 'Medium red',      eg: 'Sangiovese, Tempranillo, Merlot',   why: 'juicy acidity and moderate tannin keep pace without overpowering' },
    'light-red':      { label: 'Light red',       eg: 'Pinot Noir, Gamay',                 why: 'silky texture and bright red fruit flatter delicate flavours' },
    'crisp-white':    { label: 'Crisp white',     eg: 'Sauvignon Blanc, Albariño, Chablis', why: 'zesty acidity works like a squeeze of lemon' },
    'rich-white':     { label: 'Rich white',      eg: 'Chardonnay, Viognier',              why: 'round, creamy weight mirrors butter and roasted flavours' },
    'aromatic-white': { label: 'Aromatic white',  eg: 'Riesling, Gewürztraminer',          why: 'perfume and a touch of sweetness calm spice and salt' },
    'rose':           { label: 'Dry rosé',        eg: 'Provence, Tavel',                   why: 'red-berry freshness bridges white-wine lift and red-wine fruit' },
    'sparkling':      { label: 'Sparkling',       eg: 'Champagne, Cava, Crémant',          why: 'bubbles and acidity scrub the palate clean after every bite' },
    'sweet':          { label: 'Dessert wine',    eg: 'Sauternes, Tokaji, late harvest',   why: 'the wine is sweeter than the dish, so neither tastes sour' },
    'fortified':      { label: 'Fortified',       eg: 'Port, Madeira, Sherry',             why: 'concentrated, nutty depth matches intense flavours' },
    'orange':         { label: 'Orange wine',     eg: 'skin-contact whites',               why: 'grippy texture and savoury notes love earthy dishes' }
  };

  var CATS = ['Meat & Fish', 'World Kitchen', 'Cheese & Garden', 'Desserts'];
  function d(n, c, s, w) { return { n: n, c: c, s: s, w: w }; }
  var DISHES = [
    d('Grilled ribeye', 0, ['bold-red', 'medium-red'], 'Fat and char soften firm tannin, and the wine’s grip resets your palate for the next bite.'),
    d('Rack of lamb', 0, ['bold-red', 'medium-red'], 'Lamb’s sweet, gamey richness loves structured reds with a herbal edge.'),
    d('Roast chicken', 0, ['rich-white', 'light-red', 'sparkling'], 'Crisp skin and gentle meat suit a round white or a silky, low-tannin red.'),
    d('Pork chops', 0, ['light-red', 'aromatic-white', 'rose'], 'Pork is mild and slightly sweet, so fruit-forward wines with fresh acidity shine.'),
    d('Duck breast', 0, ['light-red', 'medium-red'], 'Bright acidity cuts through duck fat while red fruit echoes a cherry or plum sauce.'),
    d('BBQ ribs', 0, ['bold-red', 'medium-red', 'rose'], 'Sweet smoke wants ripe, generous fruit rather than austere tannin.'),
    d('Cheeseburger', 0, ['medium-red', 'bold-red', 'sparkling'], 'Juicy beef, cheese and pickles call for fruit, acidity and a little grip.'),
    d('Roast turkey', 0, ['light-red', 'rich-white', 'rose'], 'Lean meat and many side dishes need a flexible, gentle wine.'),
    d('Venison stew', 0, ['bold-red', 'medium-red'], 'Deep, earthy game needs a wine with matching depth and structure.'),
    d('Seared salmon', 0, ['light-red', 'rich-white', 'rose'], 'Oily, rich fish can take a light red or a fuller white.'),
    d('Grilled shrimp', 0, ['crisp-white', 'rose', 'sparkling'], 'Sweet shellfish and char like brisk, citrusy refreshment.'),
    d('Oysters', 0, ['sparkling', 'crisp-white'], 'Briny minerality meets its mirror in lean, saline, high-acid wine.'),
    d('Buttered lobster', 0, ['rich-white', 'sparkling'], 'Sweet lobster and melted butter want a creamy white or fine bubbles.'),
    d('Margherita pizza', 1, ['medium-red', 'light-red', 'rose'], 'Tomato acidity needs a wine with equal brightness and soft tannin.'),
    d('Spaghetti Bolognese', 1, ['medium-red', 'bold-red'], 'Slow-cooked meat and tomato love savoury, high-acid Italian-style reds.'),
    d('Mushroom risotto', 1, ['light-red', 'rich-white', 'orange'], 'Earthy mushrooms and creamy rice pair with earthy reds or textured whites.'),
    d('Pesto pasta', 1, ['crisp-white', 'rose'], 'Basil and garlic are echoed by herbal, zippy whites.'),
    d('Pad Thai', 1, ['aromatic-white', 'rose', 'sparkling'], 'Sweet, sour and salty together are tamed by fragrant, off-dry wines.'),
    d('Sushi', 1, ['sparkling', 'crisp-white', 'aromatic-white'], 'Delicate fish and vinegared rice want purity, not oak or tannin.'),
    d('Chicken tikka masala', 1, ['aromatic-white', 'rose', 'light-red'], 'Creamy spice is soothed by fruit and a hint of sweetness; tannin would clash.'),
    d('Tacos al pastor', 1, ['rose', 'light-red', 'aromatic-white'], 'Chile, pineapple and pork like chilled, fruity, low-tannin wines.'),
    d('Seafood paella', 1, ['rose', 'crisp-white', 'medium-red'], 'Saffron, shellfish and smoky paprika sit between white and red, so rosé is at home.'),
    d('Peking duck', 1, ['light-red', 'aromatic-white', 'sparkling'], 'Crisp skin and sweet hoisin need fruit and freshness.'),
    d('Tonkotsu ramen', 1, ['aromatic-white', 'sparkling', 'light-red'], 'Rich pork broth is lifted by acidity and a little aromatic sweetness.'),
    d('Coq au vin', 1, ['light-red', 'medium-red'], 'Cook with it, drink with it: earthy red Burgundy style is the classic.'),
    d('Moussaka', 1, ['medium-red', 'bold-red', 'orange'], 'Aubergine, lamb and béchamel want savoury warmth and soft spice.'),
    d('Fish & chips', 1, ['sparkling', 'crisp-white'], 'Bubbles and acid cut straight through the fried batter.'),
    d('Cheese fondue', 1, ['crisp-white', 'aromatic-white', 'sparkling'], 'Molten cheese needs sharp acidity to stay light on its feet.'),
    d('Goat cheese salad', 2, ['crisp-white', 'rose'], 'Tangy cheese and vinaigrette match grassy, citrusy whites.'),
    d('Blue cheese', 2, ['sweet', 'fortified'], 'Salt and sweet is the great contrast: pungent blue with luscious wine.'),
    d('Aged cheddar', 2, ['bold-red', 'fortified', 'medium-red'], 'Sharp, crystalline cheese softens tannin and loves nutty depth.'),
    d('Charcuterie board', 2, ['light-red', 'rose', 'sparkling', 'medium-red'], 'Salt and fat want fresh, chillable wines that keep you reaching back.'),
    d('Roasted vegetables', 2, ['orange', 'medium-red', 'rich-white'], 'Caramelised edges and earthiness suit textured, savoury wines.'),
    d('Dark chocolate cake', 3, ['fortified', 'sweet'], 'Bitter cocoa overwhelms dry wine; rich, sweet fortified wine holds its own.'),
    d('Crème brûlée', 3, ['sweet', 'sparkling'], 'Custard and burnt sugar echo honeyed, golden dessert wine.'),
    d('Apple tart', 3, ['sweet', 'aromatic-white'], 'Baked apple and pastry love late-harvest orchard-fruit flavours.'),
    d('Cheesecake', 3, ['sweet', 'sparkling', 'aromatic-white'], 'Creamy tang wants sweetness with a spine of acidity.'),
    d('Berry pavlova', 3, ['sparkling', 'rose', 'sweet'], 'Meringue and fresh berries are light as air, and so are bubbles.'),
    d('Tiramisu', 3, ['fortified', 'sweet'], 'Coffee, cocoa and mascarpone meet nutty, raisined fortified wine.'),
    d('Lemon tart', 3, ['sweet', 'aromatic-white', 'sparkling'], 'Sharp citrus curd needs a wine with both sugar and high acid.')
  ];

  var AROMAS = [
    { n: 'Red Fruit',  color: '#c0364f', d: ['cherry', 'raspberry', 'strawberry', 'cranberry', 'pomegranate'] },
    { n: 'Dark Fruit', color: '#7a3a80', d: ['blackberry', 'cassis', 'plum', 'blueberry', 'fig'] },
    { n: 'Orchard',    color: '#c9b33a', d: ['lemon', 'grapefruit', 'green apple', 'pear', 'peach'] },
    { n: 'Floral',     color: '#d184ad', d: ['rose', 'violet', 'orange blossom', 'honeysuckle', 'lavender'] },
    { n: 'Herbal',     color: '#6f9c5a', d: ['mint', 'eucalyptus', 'thyme', 'bell pepper', 'cut grass'] },
    { n: 'Earth',      color: '#8d6a48', d: ['mushroom', 'wet stone', 'forest floor', 'leather', 'truffle'] },
    { n: 'Oak',        color: '#b98545', d: ['vanilla', 'toast', 'cedar', 'smoke', 'coconut'] },
    { n: 'Spice',      color: '#c4602f', d: ['black pepper', 'clove', 'cinnamon', 'licorice', 'nutmeg'] },
    { n: 'Sweet',      color: '#dba63f', d: ['honey', 'caramel', 'chocolate', 'coffee', 'brioche'] }
  ];

  function seed() {
    var y = new Date().getFullYear(), t = Date.now(), rid = 'rack1';
    function b(r, c, name, producer, vintage, type, region, grape, price, value, extra) {
      var o = { id: 's' + r + c, seed: true, rackId: rid, r: r, c: c, name: name, producer: producer, vintage: vintage, type: type, region: region, grape: grape, price: price, value: value, style: '', from: null, to: null, notes: '', label: '', addedAt: t };
      if (extra) for (var k in extra) o[k] = extra[k];
      return o;
    }
    return {
      v: 1, ageOk: false, scoreMode: '100', rules: {},
      racks: [{ id: rid, name: 'Dining Room Rack', kind: 'Rack', rows: 4, cols: 6 }],
      bottles: [
        b(0, 0, 'Stag Hollow Cabernet Sauvignon', 'Stag Hollow Vineyards', y - 8, 'red', 'Napa Valley', 'Cabernet Sauvignon', 68, 85, { notes: 'Anniversary bottle. Decant an hour.' }),
        b(0, 1, 'Barolo “Le Albe”', 'Cascina Bruna', y - 6, 'red', 'Piedmont', 'Nebbiolo', 42, 48, { from: y + 2, to: y + 14, notes: 'Needs time. Do not touch yet.' }),
        b(0, 3, 'Pinot Noir Dundee Hills', 'Domaine Lafont', y - 5, 'red', 'Willamette Valley', 'Pinot Noir', 45, 50),
        b(0, 4, 'Rioja Reserva', 'Bodegas Altamira', y - 10, 'red', 'Rioja', 'Tempranillo', 38, 46),
        b(1, 0, 'Old Vine Zinfandel', 'Old Mill Road', y - 2, 'red', 'Sonoma County', 'Zinfandel', 29, 29),
        b(1, 2, 'Sauvignon Blanc', 'Tide & Fern', y - 2, 'white', 'Marlborough', 'Sauvignon Blanc', 24, 24),
        b(1, 3, 'Pouilly-Fuissé', 'Maison Verel', y - 7, 'white', 'Burgundy', 'Chardonnay', 34, 30),
        b(1, 5, 'Riesling Kabinett', 'Weingut Steinbach', y - 4, 'white', 'Mosel', 'Riesling', 24, 27),
        b(2, 1, 'Rosé de Provence', 'Mas des Cigales', y - 3, 'rose', 'Provence', 'Grenache, Cinsault', 22, 18),
        b(2, 2, 'Brut Réserve', 'Champagne Aubry-Leclerc', null, 'sparkling', 'Champagne', 'Chardonnay, Pinot Noir', 62, 65, { from: y - 1, to: y + 4, notes: 'Non-vintage. For good news.' }),
        b(2, 4, 'Sauternes', 'Château Lourdes', y - 9, 'dessert', 'Bordeaux', 'Sémillon', 55, 70),
        b(3, 5, '10 Year Tawny Port', 'Quinta da Serra', null, 'fortified', 'Douro', 'Touriga Nacional', 36, 38, { from: y - 2, to: y + 8 })
      ],
      journal: [{
        id: 'j-seed', seed: true, date: new Date(t - 20 * 864e5).toISOString().slice(0, 10), drunk: true,
        name: 'Chianti Classico Riserva', producer: 'Fattoria del Colle', vintage: y - 7, type: 'red', region: 'Tuscany', grape: 'Sangiovese', price: 31, label: '',
        mode: '100', score: 91, aromas: ['cherry', 'leather', 'thyme', 'toast'], who: 'Sam & Priya', notes: 'Sunday ragù. Opened up beautifully after half an hour; sour-cherry and dried herbs.'
      }]
    };
  }
  return { TYPES: TYPES, RULES: RULES, STYLES: STYLES, CATS: CATS, DISHES: DISHES, AROMAS: AROMAS, seed: seed };
})();
