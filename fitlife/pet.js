// FitLife 育成キャラ「まめしば」の絵（5段階）
// stage: 0=あかちゃん 1=こいぬ 2=わんぱく 3=おとな 4=とくべつ ／ sleeping: 3日記録がないと寝ている

const O = '#F0A860', L = '#B07A45', C = '#FFF6E8', D = '#4A3426', P = '#FF9FA8', HP = '#FF7F95', GD = '#F7D35C', GL = '#C49A1A';

const tail = `<path d="M16 42 Q40 38 34 20 Q27 22 27 30 Q23 36 15 37 Z" fill="${O}" stroke="${L}"/><path d="M32 24 Q31 29 27 31" fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round"/>`;
const body = `<ellipse cx="0" cy="40" rx="21" ry="18" fill="${O}" stroke="${L}"/><ellipse cx="0" cy="43" rx="11" ry="11" fill="${C}"/><circle cx="-9" cy="56" r="5.5" fill="${C}" stroke="${L}"/><circle cx="9" cy="56" r="5.5" fill="${C}" stroke="${L}"/>`;
const lying = `<ellipse cx="8" cy="38" rx="34" ry="16" fill="${O}" stroke="${L}"/><circle cx="30" cy="32" r="8" fill="${O}" stroke="${L}"/><circle cx="-8" cy="50" r="5" fill="${C}" stroke="${L}"/>`;
const head = `<path d="M-31 -4 Q-36 -40 -21 -41 Q-11 -40 -5 -24 Z" fill="${O}" stroke="${L}" stroke-linejoin="round"/><path d="M31 -4 Q36 -40 21 -41 Q11 -40 5 -24 Z" fill="${O}" stroke="${L}" stroke-linejoin="round"/>
<path d="M-26 -12 Q-29 -34 -21 -34 Q-14 -32 -11 -23 Z" fill="#FFD9D2"/><path d="M26 -12 Q29 -34 21 -34 Q14 -32 11 -23 Z" fill="#FFD9D2"/>
<ellipse cx="0" cy="2" rx="37" ry="31" fill="${O}" stroke="${L}"/><ellipse cx="0" cy="15" rx="25" ry="16" fill="${C}"/><ellipse cx="-13" cy="-10" rx="4" ry="2.6" fill="${C}"/><ellipse cx="13" cy="-10" rx="4" ry="2.6" fill="${C}"/>
<ellipse cx="0" cy="10" rx="3.2" ry="2.3" fill="${D}"/><path d="M-5 14 Q-2.5 17.5 0 14 Q2.5 17.5 5 14" fill="none" stroke="${D}" stroke-width="1.2" stroke-linecap="round"/>
<ellipse cx="-24" cy="12" rx="6" ry="3.8" fill="${P}" opacity=".8"/><ellipse cx="24" cy="12" rx="6" ry="3.8" fill="${P}" opacity=".8"/>`;
const eyes = `<ellipse cx="-14" cy="3" rx="5" ry="5.8" fill="${D}"/><ellipse cx="14" cy="3" rx="5" ry="5.8" fill="${D}"/><circle cx="-12.3" cy=".8" r="2" fill="#fff"/><circle cx="15.7" cy=".8" r="2" fill="#fff"/><circle cx="-15.6" cy="5.6" r=".9" fill="#fff"/><circle cx="12.4" cy="5.6" r=".9" fill="#fff"/>`;
const shut = `<path d="M-19 3 Q-14 7.5 -9 3" fill="none" stroke="${D}" stroke-width="2" stroke-linecap="round"/><path d="M9 3 Q14 7.5 19 3" fill="none" stroke="${D}" stroke-width="2" stroke-linecap="round"/>`;
const heart = (x, y) => `<path transform="translate(${x} ${y})" d="M0 3 C-6 -3 -6 -7 -3 -7 C-1.5 -7 0 -5.5 0 -4.5 C0 -5.5 1.5 -7 3 -7 C6 -7 6 -3 0 3 Z" fill="${HP}"/>`;
const zz = `<circle cx="44" cy="-28" r="7" fill="none" stroke="#9CC8EE" stroke-width="1.5"/><circle cx="52" cy="-40" r="3.5" fill="none" stroke="#9CC8EE" stroke-width="1.2"/>`;

// 段階ごとの小物（体の上・頭の下 / 頭の上）
const UNDER = [
  '',
  '',
  `<path d="M-20 26 L20 26 L0 44 Z" fill="#7FB8EA" stroke="#4A86BD" stroke-linejoin="round"/><circle cx="-5" cy="31" r="1.8" fill="#fff"/><circle cx="6" cy="30" r="1.8" fill="#fff"/><circle cx="0" cy="37" r="1.5" fill="#fff"/>`,
  `<path d="M-20 25 Q0 34 20 25" fill="none" stroke="${HP}" stroke-width="5" stroke-linecap="round"/><circle cx="0" cy="33" r="4.5" fill="${GD}" stroke="${GL}"/>`,
  `<circle cx="0" cy="27" r="4" fill="${GD}" stroke="${GL}"/>`,
];
const OVER = [
  '',
  heart(40, -34),
  `<path d="M-2.5 15.5 Q0 22 2.5 15.5 Z" fill="${HP}"/>`,
  `<g transform="translate(-24 -28)"><path d="M0 0 L-9 -5 L-9 5 Z M0 0 L9 -5 L9 5 Z" fill="${HP}"/><circle r="2.6" fill="#FF5C78"/></g>`,
  `<polygon points="-13,-28 -13,-43 -6,-35 0,-47 6,-35 13,-43 13,-28" fill="${GD}" stroke="${GL}" stroke-linejoin="round"/><circle cx="0" cy="-35" r="2.2" fill="${HP}"/><path d="M-46 -26 l3 -7 l3 7 l-3 7 Z" fill="${GD}"/><path d="M42 -6 l2.5 -6 l2.5 6 l-2.5 6 Z" fill="${GD}"/>${heart(-42, 6)}`,
];
const CAPE = `<path d="M-18 22 Q-36 48 -28 62 L28 62 Q36 48 18 22 Z" fill="#B79BE6" stroke="#7C61B8"/>`;

export function petSVG(stage = 0, sleeping = false, cls = 'pet'){
  const s = Math.max(0, Math.min(4, stage));
  const asleep = sleeping || s === 0;
  let g;
  if(s === 0) g = lying + head + shut + zz;
  else g = (s === 4 ? CAPE : '') + tail + body + UNDER[s] + head + (asleep ? shut + zz + (s >= 3 ? OVER[s] : '') : eyes + OVER[s]);
  return `<svg class="${cls}" viewBox="-56 -54 112 120" role="img" aria-label="まめしば"><g stroke-width="1">${g}</g></svg>`;
}
