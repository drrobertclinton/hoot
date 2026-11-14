// Optional Scripture reflections (shown only when "Faith content" is on in Settings).
// Text: World English Bible (public domain), checked against the WEB published at ebible.org (October 2026).
// Following Robert's standard (same as Called to Pray), the divine name "Yahweh" is rendered "the LORD".
export type Reflection = { ref: string; text: string; prompt: string };

export const TRANSLATION = 'WEB';

export const REFLECTIONS: Reflection[] = [
  { ref: 'Psalm 46:10', text: 'Be still, and know that I am God.', prompt: 'Where could you build two minutes of stillness into today?' },
  { ref: 'Matthew 11:28', text: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.', prompt: 'What are you carrying this week that you could set down?' },
  { ref: 'Isaiah 40:31', text: 'But those who wait for the LORD will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.', prompt: 'What renews your strength when you feel worn out?' },
  { ref: 'Philippians 4:6–7', text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.', prompt: 'Name one worry and one thing you are thankful for.' },
  { ref: 'Lamentations 3:22–23', text: 'It is because of the LORD’s loving kindnesses that we are not consumed, because his mercies don’t fail. They are new every morning. Great is your faithfulness.', prompt: 'What would a fresh start look like tomorrow morning?' },
  { ref: 'Proverbs 3:5–6', text: 'Trust in the LORD with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.', prompt: 'Which decision this week could use patience rather than force?' },
  { ref: 'Psalm 23:1–3', text: 'The LORD is my shepherd; I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul. He guides me in the paths of righteousness for his name’s sake.', prompt: 'Where are your “still waters” this week?' },
  { ref: '3 John 1:2', text: 'Beloved, I pray that you may prosper in all things and be healthy, even as your soul prospers.', prompt: 'How are you caring for your soul alongside your body?' },
];

export function reflectionFor(dayIndex: number): Reflection {
  return REFLECTIONS[((dayIndex % REFLECTIONS.length) + REFLECTIONS.length) % REFLECTIONS.length];
}
