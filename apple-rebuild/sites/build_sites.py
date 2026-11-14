#!/usr/bin/env python3
"""Builds one small marketing site per rebuilt app. Each site has its own look."""
import os, html, sys
OUT = sys.argv[1]
EMAIL = 'robert@vilasigrowth.com'

BASE = """
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:400 18px/1.6 var(--body);-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}a{color:var(--link)}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
header.top{display:flex;align-items:center;gap:12px;padding:22px 0}
header.top img{width:44px;height:44px;border-radius:11px}
header.top .nm{font:var(--namefont);letter-spacing:var(--namels,0);color:var(--ink)}
header.top nav{margin-left:auto;display:flex;gap:22px;font-size:15px}
header.top nav a{text-decoration:none;color:var(--mute)}
.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:36px 0 72px}
.hero h1{font:var(--h1);letter-spacing:var(--h1ls,-.01em);margin:0 0 18px;text-wrap:balance}
.hero p.lede{font-size:21px;line-height:1.5;color:var(--soft);margin:0 0 26px;max-width:34em}
.pill{display:inline-flex;align-items:center;gap:10px;padding:12px 20px;border-radius:var(--pillr,999px);background:var(--accent);color:var(--onaccent);font:var(--pillfont);letter-spacing:var(--pillls,.02em);text-decoration:none}
.sub{display:block;margin-top:14px;font-size:14.5px;color:var(--mute)}
.phone{width:min(100%,300px);border-radius:44px;padding:10px;background:var(--bezel);box-shadow:var(--phoneshadow);margin:0 auto}
.phone img{border-radius:35px;width:100%;height:auto}
.duo{position:relative;height:620px}
.duo .phone{position:absolute;width:280px}
.duo .phone:first-child{left:0;top:40px;transform:rotate(-5deg)}
.duo .phone:last-child{right:0;top:0;transform:rotate(4deg)}
.eyebrow{font:var(--eyebrow);letter-spacing:var(--eyels,.2em);text-transform:uppercase;color:var(--accent2);margin:0 0 12px}
.feat{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;padding:64px 0;border-top:var(--rule)}
.feat:nth-of-type(even) .txt{order:2}
.feat h2{font:var(--h2);margin:0 0 14px;text-wrap:balance}
.feat p{margin:0 0 12px;color:var(--soft);max-width:30em}
.feat ul{margin:14px 0 0;padding:0;list-style:none}
.feat li{padding:9px 0 9px 26px;position:relative;border-top:var(--rule);font-size:16.5px;color:var(--soft)}
.feat li::before{content:"";position:absolute;left:2px;top:19px;width:10px;height:10px;border-radius:var(--dotr,50%);background:var(--accent2)}
.band{margin:28px 0 0;padding:56px 0;background:var(--bandbg);color:var(--bandink);border-top:var(--rule);border-bottom:var(--rule)}
.band h2{font:var(--h2);margin:0 0 22px}
.band .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.band h3{font:var(--h3);margin:0 0 6px;color:var(--bandhead)}
.band p{margin:0;font-size:16px;opacity:.86}
footer{padding:36px 0 56px;font-size:14.5px;color:var(--mute)}
footer a{color:var(--mute);margin-right:18px}
.doc{max-width:740px;padding-bottom:80px}
.doc h1{font:var(--h1);font-size:clamp(34px,6vw,52px);margin:24px 0 10px}
.doc h2{font:var(--h3);font-size:22px;margin:38px 0 8px;color:var(--ink)}
.doc p,.doc li{color:var(--soft)}
.wide{width:min(100%,640px);border-radius:26px;padding:9px;background:var(--bezel);box-shadow:var(--phoneshadow);margin:0 auto}
.wide img{border-radius:18px;width:100%;height:auto}
.hero .wide{width:min(100%,920px)}
@media (max-width:820px){
 body{font-size:17px}.wrap{padding:0 20px}
 .hero,.feat{grid-template-columns:1fr;gap:32px}.hero{padding:16px 0 48px}.feat{padding:44px 0}
 .feat:nth-of-type(even) .txt{order:0}
 .band .cols{grid-template-columns:1fr}
 .duo{height:auto;display:flex;gap:12px;justify-content:center}
 .duo .phone{position:static;width:46%;transform:none!important;border-radius:28px;padding:6px}
 .duo .phone img{border-radius:22px}
 header.top nav a.hide{display:none}
}
"""

SITES = {
'cellar-table': dict(
  name='Cellar & Table', title='Cellar & Table: your wine rack, on your phone',
  desc='A wine cellar app whose home screen is your actual rack. See what is ready to open, pair a bottle with dinner, and keep tasting notes. Private and offline.',
  fonts='family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,400',
  css=""":root{--bg:#150d08;--ink:#f2e6cf;--soft:#d9c7a6;--mute:#a58d6c;--accent:linear-gradient(180deg,#ffd98f,#d99a3a);--onaccent:#2a1a12;--accent2:#f0b95a;--link:#f0b95a;
--body:'EB Garamond',Georgia,serif;--h1:600 clamp(42px,6.4vw,76px)/1.02 'Cormorant Garamond',Georgia,serif;--h2:600 clamp(30px,3.8vw,44px)/1.1 'Cormorant Garamond',Georgia,serif;--h3:600 22px/1.2 'Cormorant Garamond',Georgia,serif;
--namefont:600 24px 'Cormorant Garamond',Georgia,serif;--eyebrow:500 14px 'EB Garamond',serif;--eyels:.32em;--pillfont:600 18px 'EB Garamond',serif;
--bezel:linear-gradient(160deg,#7a542c,#3f2811);--phoneshadow:0 40px 80px rgba(0,0,0,.65),0 0 90px rgba(240,160,70,.16),inset 0 1px 0 rgba(255,225,170,.4);
--rule:1px solid rgba(240,185,90,.2);--bandbg:#3c0e18;--bandink:#f2e6cf;--bandhead:#ffd98f}
body{background:radial-gradient(900px 600px at 70% 0,rgba(110,22,41,.55),transparent 70%),repeating-linear-gradient(90deg,rgba(255,225,170,.018) 0 2px,transparent 2px 9px),#150d08}
.hero h1 em{font-style:italic;color:#f0b95a;font-weight:500}""",
  h1='Your rack, <em>your</em> table.',
  lede='Cellar & Table puts your real wine rack on the screen, slot for slot. Bottles glow when they are ready to drink, and tonight’s dinner tells you which one to pull.',
  hero=['rack','wheel'],
  feats=[
   ('The rack is the app','A home screen shaped like your shelf','Set the rows and columns once and every bottle sits where it really sits. Press, hold and drag when you move one. Search lights up the slots that match, so you walk straight to the bottle.',
    ['Racks, fridges and cases, each with its own grid','Capsule colours for red, white, rosé, sparkling, dessert and fortified','An “open first” card for the bottle whose window closes soonest'],'rack'),
   ('Drinking windows','Know what to open and what to leave alone','Every bottle gets a drinking window from its type and vintage, and you can change the rules or set your own years. One timeline shows what is open now, what is still sleeping and what is past its best.',[],'windows'),
   ('Pairing wheel','Spin a dish, find the bottle','Forty dishes, from grilled ribeye to lemon tart. Pick one and the wheel gives the wine styles that suit it, says why in one sentence, and lights the matching bottles you already own.',[],'wheel'),
   ('Tasting notes','An aroma wheel instead of a blank box','Tap what you smell, score it out of 100 or five stars, and say who you shared it with. Finished bottles move to a journal you can read back.',[],'notes')],
  band=('Made for adults who keep wine at home',[('Private','No account, no ads, no analytics in the app. Your cellar is stored on your phone.'),('Offline','Works in a basement with no signal. Export a backup file whenever you like.'),('21 and over','For adults of legal drinking age. Please enjoy wine responsibly.')]),
  privacy_extra='If you take a label photo, the app uses the camera or your photo library only for that photo. The photo is stored on your device with the bottle and is not uploaded.',
  faq=[('Where is my cellar stored?','On your phone. Nothing is uploaded, so it does not sync between devices. Use Export a backup in Settings to move it or keep a copy.'),
       ('How are drinking windows worked out?','From the wine type and vintage, using rules you can edit in Settings. You can also set the years for a single bottle. They are guidance, not a guarantee.'),
       ('Can I have more than one rack?','Yes. Add racks, fridges or cases under Racks & Fridges, each with its own rows and columns.'),
       ('Does it sell wine?','No. Cellar & Table has no shop, no purchases and no ads.')]),

'timepieces': dict(
  name='Vilasi Timepieces', title='Vilasi Timepieces: fit, accuracy and care for your watches',
  desc='A watch owner’s tool: see a watch at true size on your wrist, log accuracy in seconds per day, listen to a movement with the timegrapher, and track service and papers.',
  fonts='family=Barlow+Condensed:wght@500;600&family=Barlow:wght@400;500&family=Cormorant:wght@500;600',
  css=""":root{--bg:#050607;--ink:#eef1ee;--soft:#b7beb9;--mute:#7c857f;--accent:#a6f7b6;--onaccent:#04130a;--accent2:#a6f7b6;--link:#a6f7b6;
--body:'Barlow',system-ui,sans-serif;--h1:500 clamp(44px,6.6vw,80px)/1 'Cormorant',Georgia,serif;--h2:500 clamp(30px,3.8vw,44px)/1.08 'Cormorant',Georgia,serif;--h3:600 17px/1.2 'Barlow Condensed',sans-serif;
--namefont:600 17px 'Barlow Condensed',sans-serif;--namels:.3em;--eyebrow:600 14px 'Barlow Condensed',sans-serif;--eyels:.28em;--pillfont:600 16px 'Barlow Condensed',sans-serif;--pillls:.18em;--pillr:6px;--dotr:0;
--bezel:linear-gradient(145deg,#c9ced0,#5a6063 30%,#22262a 60%,#8b9194);--phoneshadow:0 40px 90px rgba(0,0,0,.8),0 0 80px rgba(166,247,182,.08);
--rule:1px solid #1c2124;--bandbg:#0b0e0f;--bandink:#eef1ee;--bandhead:#a6f7b6}
header.top .nm{text-transform:uppercase}.pill{text-transform:uppercase}.band h3{text-transform:uppercase;letter-spacing:.2em}
body{background:radial-gradient(700px 500px at 75% 8%,rgba(166,247,182,.07),transparent 70%),#050607}
.hero h1 b{font-weight:500;color:#a6f7b6}""",
  h1='Know your watches <b>to the second.</b>',
  lede='Vilasi Timepieces is a workshop for people who wear mechanical watches. It checks how a watch fits your wrist, how well it keeps time and when it is due for service.',
  hero=['dial','accuracy'],
  feats=[
   ('No. 01 · Wrist fit','See a watch at its real size before you buy','Enter your wrist and three case measurements. The watch is drawn on screen at true physical scale, calibrated once with a bank card, with a plain verdict on whether the lugs overhang.',[],'fit'),
   ('No. 02 · Accuracy log','Seconds per day, tracked properly','Tap to sync against your phone’s clock, then again a day later. The log charts each watch’s rate over time, by position, and flags a movement that drifts outside its specification.',
    ['Rate chart with the tolerance band drawn in','Readings on the wrist, dial up, crown down','A timegrapher that listens to the movement through the microphone'],'accuracy'),
   ('No. 04 · Rotation','What am I wearing today?','Log a wear in one tap. A ten-week calendar shows which watches earn their place, which one has been resting too long, and a suggestion for the day you have planned.',[],'rotation'),
   ('The dial is the menu','Every watch drawn from its own details','The home screen is a live dial showing the real time, drawn from the case, dial and hands you entered. Swipe between watches. Tap the bezel to open a tool.',[],'dial')],
  band=('Built for owners, not for selling',[('Private','No account, no ads, no analytics in the app. Your collection, prices and papers stay on your phone.'),('Microphone','The timegrapher analyses sound live to measure beat rate. Audio is never recorded or stored.'),('Independent','Not affiliated with any watch brand. Brand names belong to their owners.')]),
  privacy_extra='The Timegrapher uses the microphone to hear a watch movement. Sound is analysed on your device as it arrives and is never recorded, stored or sent anywhere.',
  faq=[('How does true-scale Wrist Fit work?','Hold a bank card against the screen once to calibrate. After that, watches are drawn at their real size in millimetres.'),
       ('How accurate is the timegrapher?','It measures beat rate, rate and beat error from the sound of the movement. A quiet room and the phone’s microphone near the case back give the best reading. It is a guide, not a replacement for a watchmaker’s instrument.'),
       ('Where is my collection stored?','On your phone only. Use the export in Workshop to keep a backup or an insurance summary.'),
       ('Is this connected to a watch brand?','No. Vilasi Timepieces is independent and sells nothing.')]),

'worthmark': dict(
  name='Worthmark', title='Worthmark: decide what is worth buying',
  desc='A mindful-buying notebook. Run the Worth Test, lock a want in the cool-off vault, see the real cost per use, and check 30 days later whether it was worth it.',
  fonts='family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400',
  css=""":root{--bg:#f3eee3;--ink:#1a1814;--soft:#3d3a33;--mute:#7a7467;--accent:#1a1814;--onaccent:#f3eee3;--accent2:#a8843a;--link:#1a1814;
--body:'Newsreader',Georgia,serif;--h1:400 clamp(46px,7vw,88px)/.98 'Newsreader',Georgia,serif;--h1ls:-.03em;--h2:400 clamp(30px,3.8vw,44px)/1.08 'Newsreader',Georgia,serif;--h3:500 20px/1.2 'Newsreader',Georgia,serif;
--namefont:500 26px 'Newsreader',Georgia,serif;--namels:-.02em;--eyebrow:500 13px 'Newsreader',serif;--eyels:.24em;--pillfont:500 17px 'Newsreader',serif;--pillr:0;--dotr:0;
--bezel:#1a1814;--phoneshadow:14px 14px 0 rgba(26,24,20,.12);
--rule:1px solid #1a1814;--bandbg:#1a1814;--bandink:#f3eee3;--bandhead:#d9b765}
.hero{border-top:4px double #1a1814;padding-top:48px}.hero h1 i{font-style:italic}
.feat li::before{height:1px;width:14px;top:23px;background:#1a1814}.feat li{border-top:1px solid #cfc7b4}
.phone{border-radius:38px}""",
  h1='Things worth having, <i>and things worth leaving.</i>',
  lede='Worthmark is a ledger for the things you want to buy. It slows the decision down just enough to tell a real want from an impulse, then checks afterwards whether you were right.',
  hero=['ledger','vault'],
  feats=[
   ('§ I · The cool-off vault','Set it aside for 24 hours, 72 hours or a week','The vault counts down to the second. When it opens, Worthmark asks one question: still want it? Say no and the price is added to the money you kept.',[],'vault'),
   ('§ II · The Worth Test','Seven questions, then a verdict','Do you own something that does this already? Will you use it next week? The test ends in BUY, WAIT or SKIP, with the reasons written out so you can argue with them.',[],'ledger'),
   ('§ III · Cost per use','What each use really costs','Price divided by the uses you expect, set beside the cheaper pair, the rental or keeping what you have. After you buy, one tap per use shows the real figure coming down.',
    ['Compare any alternative you type in','A 30-day regret check on everything you buy','Insights: your hit rate and your most regretted categories'],'cost')],
  band=('A notebook, not a shop',[('No selling','No affiliate links, no ads, nothing to buy inside the app.'),('Private','No account and no tracking in the app. Your ledger stays on your phone.'),('Yours to take','Export everything as a file, or delete it all, from Settings.')]),
  privacy_extra='Price-check buttons open an ordinary shop search in your browser. Worthmark does not use affiliate links and does not learn what you do there.',
  faq=[('Is this a budgeting app?','No. It does not connect to a bank. It keeps a monthly “wants” allowance you set yourself and a record of each decision.'),
       ('What happens when the vault opens?','You are asked whether you still want the item. Yes moves it back to deciding; no records it as skipped and adds the price to money kept.'),
       ('Where is my ledger stored?','On your phone only. Export a backup from Settings.'),
       ('Does Worthmark earn money when I buy?','No. There are no affiliate links or purchases.')]),

'gift-pilot': dict(
  name='Shop Gift Pilot', title='Shop Gift Pilot: every gift, on time',
  desc='A gift planner run like an airport departures board. Every birthday and holiday counts down, each person has a boarding pass, and a quick interview turns into three gift picks.',
  fonts='family=Space+Mono:wght@400;700&family=Inter:wght@400;500;700;800',
  css=""":root{--bg:#060b1a;--ink:#eef2ff;--soft:#c2cbe6;--mute:#7f8bb0;--accent:linear-gradient(180deg,#ffd166,#ffb020);--onaccent:#1a1304;--accent2:#ffb020;--link:#ffc247;
--body:'Inter',system-ui,sans-serif;--h1:800 clamp(40px,6vw,72px)/1.02 'Inter',system-ui,sans-serif;--h1ls:-.03em;--h2:800 clamp(28px,3.4vw,40px)/1.1 'Inter',system-ui,sans-serif;--h3:700 14px/1.2 'Space Mono',monospace;
--namefont:700 16px 'Space Mono',monospace;--namels:.34em;--eyebrow:700 12.5px 'Space Mono',monospace;--eyels:.26em;--pillfont:700 14px 'Space Mono',monospace;--pillls:.14em;--pillr:12px;--dotr:2px;
--bezel:#141c38;--phoneshadow:0 40px 90px rgba(0,0,0,.7),0 0 0 1px #2a3564,0 0 90px rgba(255,176,32,.1);
--rule:1px dashed #27315a;--bandbg:#f1e7cf;--bandink:#161d3a;--bandhead:#161d3a}
header.top .nm,.pill,.band h3{text-transform:uppercase}.band h3{letter-spacing:.2em}
body{background:radial-gradient(1px 1px at 12% 18%,#fff8,transparent),radial-gradient(1px 1px at 68% 9%,#fff7,transparent),radial-gradient(1px 1px at 88% 31%,#fff6,transparent),radial-gradient(1px 1px at 34% 52%,#fff5,transparent),linear-gradient(#050814,#0b1433 60%,#060b1a)}
.flap{display:inline-flex;gap:4px;margin-bottom:18px}.flap b{font:700 22px 'Space Mono',monospace;color:#ffc247;background:linear-gradient(#1a2242 49%,#0c1126 50%,#151c3a 51%);padding:6px 9px;border-radius:5px;border:1px solid #2a3564}""",
  h1='Every gift, on time.',
  pre='<div class="flap" aria-hidden="true"><b>O</b><b>N</b><b>&nbsp;</b><b>T</b><b>I</b><b>M</b><b>E</b></div>',
  lede='Gift Pilot runs your gift list like a departures board. Each birthday and holiday counts down in days, and every gift moves from planning to delivered.',
  hero=['board','pass'],
  feats=[
   ('Departures','One board for everyone you buy for','Rows are occasions, sorted by how soon they leave. A five-step status shows where each gift stands: planning, chosen, bought, wrapped, delivered. A radar shows the next 90 days at a glance.',[],'board'),
   ('Boarding pass','A pass for every person','Each passenger carries their occasions, a wish list with secret “bought” marks, notes, and a history that warns you before you give the same thing twice.',[],'pass'),
   ('Gift interview','Seventeen yes or no cards, three picks','Swipe through quick questions about the person and set a budget. Gift Pilot files a flight plan: three concrete ideas from 186 in the app, each with the reason it fits.',[],'interview'),
   ('Logbook','A season budget that adds up','Set a cap per person for Christmas or birthdays. Planned and actual spend sit side by side, so December does not surprise you.',[],'logbook')],
  band=('Cleared for departure',[('Private','No account and no analytics in the app. People, wishes and budgets stay on your phone.'),('Reminders','Pick 3, 7, 14 or 21 days of warning, and add any occasion to your calendar.'),('For adults','Made for people 18 and over. Wine and spirits ideas stay hidden unless you confirm you are 21 or older.')]),
  privacy_extra='“Find it” opens a web search for a gift idea in your browser. Some links may earn Vilasi, Inc. a commission at no cost to you. The app does not see what you do on those sites.',
  faq=[('How does the gift interview choose?','Your yes and no answers score 186 gift ideas bundled in the app against the person and your budget. The top three are shown with the reason for each. Run it again any time.'),
       ('Can the people I buy for see their list?','No. Everything is on your phone. “Show-safe” mode hides bought marks if someone is looking over your shoulder.'),
       ('Does it buy the gift for me?','No. “Find it” opens a web search so you can buy wherever you like.'),
       ('Where is my data?','On your phone only. Export a backup or delete everything from Settings.')]),

'jonah-activity-club': dict(
  name='Jonah Activity Club', title='Jonah Activity Club: an island of activities for ages 3 to 11',
  desc='A hand-drawn island to explore with Jonah and his dog Pickles. Coloring, tracing, counting, mazes, word hunts and stickers. No ads, no accounts, no internet needed.',
  fonts='family=Baloo+2:wght@500;700;800&family=Nunito:wght@500;700',
  css=""":root{--bg:#fbf4e4;--ink:#2e3a4e;--soft:#46546b;--mute:#7b8698;--accent:#7dbb70;--onaccent:#1f2d3d;--accent2:#ef5d50;--link:#1f7f8a;
--body:'Nunito',system-ui,sans-serif;--h1:800 clamp(44px,6.6vw,78px)/1 'Baloo 2',system-ui,sans-serif;--h2:800 clamp(30px,3.8vw,44px)/1.08 'Baloo 2',system-ui,sans-serif;--h3:700 22px/1.2 'Baloo 2',system-ui,sans-serif;
--namefont:800 24px 'Baloo 2',system-ui,sans-serif;--eyebrow:800 15px 'Baloo 2',system-ui,sans-serif;--eyels:.12em;--pillfont:800 19px 'Baloo 2',system-ui,sans-serif;
--bezel:#2e3a4e;--phoneshadow:0 10px 0 #2e3a4e,0 30px 50px rgba(46,58,78,.25);
--rule:3px dashed #e6d7b4;--bandbg:#bfe6ea;--bandink:#2e3a4e;--bandhead:#2e3a4e}
.pill{border:3px solid #2e3a4e;box-shadow:0 5px 0 #2e3a4e}
.hero{grid-template-columns:1fr;text-align:center;gap:30px}.hero p.lede{margin-left:auto;margin-right:auto}
.hero h1 span:nth-child(1){color:#ef5d50}.hero h1 span:nth-child(2){color:#2f8590}.hero h1 span:nth-child(3){color:#e39a1f}
.band{border:0;border-radius:36px;margin:28px 24px 0;padding:44px 12px}
@media (min-width:821px){.feat{grid-template-columns:.8fr 1.2fr}}""",
  h1='<span>An island</span> <span>full of</span> <span>things to do.</span>',
  lede='Jonah Activity Club is a seaside island that children explore by tapping. Pickles the dog walks the path to each place, and every place is an activity from the Jonah Pruitt picture books.',
  hero=['map'], wide=True,
  feats=[
   ('The island','No menus. Just a map.','Tap the treehouse, the tide pools, the dock, the boardwalk or the lighthouse and Pickles trots there. Spoken prompts mean children aged 3 to 5 do not need to read.',[],'map'),
   ('Color Pickles','The dog you color is the dog who walks','Tap to fill or draw with a free crayon. The Pickles a child colors becomes the Pickles on the map and in the mazes.',
    ['Coloring pages with tap-to-fill and crayons','Letter and number tracing that checks each stroke','Counting, memory match, mazes, word hunts and a sticker treehouse'],'coloring'),
   ('For grown-ups','Three age bands and a parent gate','Choose ages 3 to 5, 6 to 8 or 9 to 11 and the activities change difficulty. Settings, progress, printing and delete sit behind a press-and-hold gate with a sum.',[],'title')],
  band=('Safe by design',[('No ads','No ads, no purchases and no links out of the app.'),('No accounts','Nothing to sign up for. No names, emails or photos are collected.'),('No internet','The app works fully offline. Progress stays on the device.')]),
  privacy_extra='Jonah Activity Club is made for children. It collects no personal information from anyone, has no advertising, no analytics, no purchases and no links to the web. It does not connect to the internet.',
  kids=True,
  faq=[('What ages is it for?','Ages 3 to 11, in three bands. Pick the band in the grown-ups area.'),
       ('Does my child need to read?','Not in the youngest band. Every activity is introduced out loud, and the speaker button repeats it.'),
       ('How do I open the grown-ups area?','Press and hold the lock on the map for three seconds, then answer the sum.'),
       ('Can I print the coloring pages?','Yes, from the grown-ups area.')]),
}

def e(s): return html.escape(s, quote=True)

def head(s, title, desc, depth=''):
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title><meta name="description" content="{e(desc)}">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:type" content="website">
<link rel="icon" href="{depth}img/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?{s['fonts']}&display=swap" rel="stylesheet">
<style>{BASE}{s['css']}</style></head><body>"""

def top(s, home='./'):
    return f"""<div class="wrap"><header class="top"><a href="{home}"><img src="img/icon.svg" alt=""></a><span class="nm">{e(s['name'])}</span>
<nav><a class="hide" href="{home}#features">Features</a><a href="support.html">Support</a><a href="privacy.html">Privacy</a></nav></header></div>"""

def foot(s):
    return f"""<div class="wrap"><footer><p><a href="./">{e(s['name'])}</a><a href="support.html">Support</a><a href="privacy.html">Privacy</a></p>
<p>© 2026 Vilasi, Inc.</p></footer></div></body></html>"""

def phone(slug, img, alt, wide=False):
    cls = 'wide' if wide else 'phone'
    w, h = (1704, 786) if wide else (786, 1704)
    return f'<div class="{cls}"><img src="img/{img}.webp" width="{w}" height="{h}" alt="{e(alt)}" loading="lazy"></div>'

def index(slug, s):
    wide = s.get('wide')
    if wide: heroimg = phone(slug, s['hero'][0], s['name'] + ' island map', True)
    elif len(s['hero']) == 2: heroimg = '<div class="duo">' + ''.join(phone(slug, i, s['name'] + ' screen') for i in s['hero']) + '</div>'
    else: heroimg = phone(slug, s['hero'][0], s['name'] + ' screen')
    h = head(s, s['title'], s['desc']) + top(s)
    h += f"""<main><div class="wrap"><section class="hero"><div>{s.get('pre','')}<h1>{s['h1']}</h1><p class="lede">{e(s['lede'])}</p>
<span class="pill">Coming to the App Store</span><span class="sub">For iPhone{' and iPad' if s.get('kids') else ''}.</span></div>{heroimg}</section>
<div id="features">"""
    for eye, h2, p, lis, img in s['feats']:
        ul = '<ul>' + ''.join(f'<li>{e(x)}</li>' for x in lis) + '</ul>' if lis else ''
        h += f"""<section class="feat"><div class="txt"><p class="eyebrow">{e(eye)}</p><h2>{e(h2)}</h2><p>{e(p)}</p>{ul}</div>{phone(slug, img, h2, wide)}</section>"""
    bt, cols = s['band']
    h += '</div></div><section class="band"><div class="wrap"><h2>' + e(bt) + '</h2><div class="cols">' + ''.join(f'<div><h3>{e(a)}</h3><p>{e(b)}</p></div>' for a, b in cols) + '</div></div></section></main>'
    return h + foot(s)

def privacy(slug, s):
    n = e(s['name'])
    site = ('<p>This website is a plain information page. It uses no cookies, analytics or advertising.</p>' if s.get('kids') else
            '<p>This website, unlike the app, may record basic visit statistics such as pages viewed and approximate region, through our website host. It does not know who you are in the app, and the app does not talk to this website.</p>')
    kids = ('<h2>Children’s privacy</h2><p>The app is designed for children and follows the requirements of COPPA and the App Store Kids category. Because it collects nothing, there is nothing to share, sell or delete on our side. A parent can erase all progress on the device from the grown-ups area.</p>' if s.get('kids') else
            '<h2>Children</h2><p>The app is made for adults and is not directed at children.</p>')
    return head(s, 'Privacy | ' + s['name'], 'Privacy policy for ' + s['name']) + top(s) + f"""<main class="wrap doc"><h1>Privacy</h1><p>Effective 14 November 2026. {n} is published by Vilasi, Inc.</p>
<h2>The short version</h2><p>{n} does not collect, send or sell your personal information. What you enter stays on your device.</p>
<h2>What the app stores</h2><p>Everything you add is saved in the app’s own storage on your phone or tablet. There is no account and no server copy. If you delete the app, that data is deleted with it, so export a backup first if you want to keep it.</p>
<p>{e(s['privacy_extra'])}</p>
<h2>What the app does not do</h2><p>No advertising, no analytics, no tracking across apps or websites, and no sharing of data with third parties.</p>
<h2>Your choices</h2><p>You can export your data as a file or delete all of it at any time from the app’s settings.</p>
{kids}
<h2>This website</h2>{site}
<h2>Contact</h2><p>Questions about privacy: <a href="mailto:{EMAIL}?subject={e(s['name']).replace(' ','%20')}%20privacy">{EMAIL}</a>.</p></main>""" + foot(s)

def support(slug, s):
    n = e(s['name'])
    faq = ''.join(f'<h2>{e(q)}</h2><p>{e(a)}</p>' for q, a in s['faq'])
    return head(s, 'Support | ' + s['name'], 'Help with ' + s['name']) + top(s) + f"""<main class="wrap doc"><h1>Support</h1>
<p>Need help with {n}, or found something that looks wrong? Email <a href="mailto:{EMAIL}?subject={e(s['name']).replace(' ','%20')}%20support">{EMAIL}</a> and tell us which iPhone or iPad you use. We reply within two business days.</p>
{faq}<p>Read the <a href="privacy.html">privacy policy</a>.</p></main>""" + foot(s)

for slug, s in SITES.items():
    d = os.path.join(OUT, slug)
    open(os.path.join(d, 'index.html'), 'w').write(index(slug, s))
    open(os.path.join(d, 'privacy.html'), 'w').write(privacy(slug, s))
    open(os.path.join(d, 'support.html'), 'w').write(support(slug, s))
    print('built', slug)
