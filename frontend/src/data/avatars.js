export const AVATARS = [
  { key: 'bear', label: 'Bear', emoji: '\u{1F43B}' },
  { key: 'unicorn', label: 'Unicorn', emoji: '\u{1F984}' },
  { key: 'dragon', label: 'Dragon', emoji: '\u{1F409}' },
  { key: 'cat', label: 'Cat', emoji: '\u{1F431}' },
  { key: 'dog', label: 'Dog', emoji: '\u{1F436}' },
  { key: 'rabbit', label: 'Rabbit', emoji: '\u{1F430}' },
  { key: 'fox', label: 'Fox', emoji: '\u{1F98A}' },
  { key: 'lion', label: 'Lion', emoji: '\u{1F981}' },
  { key: 'panda', label: 'Panda', emoji: '\u{1F43C}' },
  { key: 'koala', label: 'Koala', emoji: '\u{1F428}' },
  { key: 'monkey', label: 'Monkey', emoji: '\u{1F435}' },
  { key: 'penguin', label: 'Penguin', emoji: '\u{1F427}' },
  { key: 'owl', label: 'Owl', emoji: '\u{1F989}' },
  { key: 'butterfly', label: 'Butterfly', emoji: '\u{1F98B}' },
  { key: 'dolphin', label: 'Dolphin', emoji: '\u{1F42C}' },
  { key: 'star', label: 'Star', emoji: '\u{2B50}' },
  { key: 'rocket', label: 'Rocket', emoji: '\u{1F680}' },
  { key: 'rainbow', label: 'Rainbow', emoji: '\u{1F308}' },
]

export function getAvatarEmoji(key) {
  const avatar = AVATARS.find(a => a.key === key)
  return avatar ? avatar.emoji : '\u{1F43B}'
}
