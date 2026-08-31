/**
 * Deterministic pseudonym generation.
 *
 * Token mode ("[PERSON_1]") is unambiguous but reads badly, and some models
 * handle bracketed placeholders poorly — they summarise around them, or drop
 * them from generated prose. Pseudonym mode swaps real values for realistic but
 * fictional ones so the text stays natural, and the vault still maps every
 * substitution back byte-exactly.
 *
 * All fake values are drawn from ranges reserved for documentation and testing:
 *   phone   +1 555-01xx        (NANP fictional range)
 *   IP      203.0.113.x        (RFC 5737 TEST-NET-3)
 *   email   @example.com       (RFC 2606)
 *   SSN     9xx-xx-xxxx        (never issued by the SSA)
 *   cards   standard test PANs (Luhn-valid, not issuable)
 * so a pseudonymised document can never accidentally name a real person's real
 * account.
 */

const FAKE_FIRST = ('Avery Blake Casey Devon Ellis Finley Harper Jordan Kendall Lennox Morgan '
  + 'Nolan Oakley Parker Quinn Reese Sawyer Tatum Vale Wren Ainsley Bevan Corin Dara Emory '
  + 'Fallon Greer Hollis Indigo Juno Keaton Linden Marlowe Niall Oriel Payton Rowan Sloane '
  + 'Teagan Vesper Wilder Yarrow Zephyr Alden Briar Calloway Dagny Everly').split(' ');

const FAKE_LAST = ('Aldridge Beaumont Calderwood Dunmore Everhart Fairbourne Grantley Halloway '
  + 'Ivorson Jessup Kingsford Larkspur Marchetti Northcote Oakhurst Pemberton Quarles Redgrave '
  + 'Stanhope Thackery Underhill Vandermere Wexford Yarborough Zellweger Ashcombe Brambleton '
  + 'Crowther Delacourt Ellingham Fenwick Garnsey Havercroft Inglewood Jarrow Kestrel Lambourne '
  + 'Mowbray Netherfield Ormsby Pennington Ravenswood Somerville Trafford Voss Whitlock').split(' ');

const FAKE_STREET = ('Maple Cedar Birch Aspen Willow Juniper Laurel Sycamore Poplar Hawthorn '
  + 'Alder Rowan Elder Hazel Linden').split(' ');

const STREET_TYPE = ['Street', 'Avenue', 'Road', 'Lane', 'Drive', 'Court', 'Way'];

const FAKE_ORG_A = ('Northwind Blackwood Silverline Redstone Brightpath Ironvale Clearwater '
  + 'Stonebridge Highfield Westmoor').split(' ');

const FAKE_ORG_B = ('Systems Holdings Partners Logistics Analytics Dynamics Industries Consulting '
  + 'Ventures Group').split(' ');

const TEST_CARDS = [
  '4111 1111 1111 1111', '4012 8888 8888 1881', '5555 5555 5555 4444',
  '5105 1051 0510 5100', '3782 822463 10005', '6011 1111 1111 1117',
];

/** FNV-1a, 32-bit. Small, fast, and stable across runs and platforms. */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// Seeds are hashed to unsigned 32-bit, but shifting one right with >> can still
// produce a negative number, and a negative index silently yields undefined.
// Both helpers normalise before indexing.
const pick = (arr, seed) => arr[((seed % arr.length) + arr.length) % arr.length];
const digits = (seed, n) => String(Math.abs(seed) % 10 ** n).padStart(n, '0');

/**
 * Build a pseudonym factory. `used` guarantees uniqueness, and `sourceText`
 * guarantees a generated fake never collides with a string already present in
 * the document (which would make re-hydration ambiguous).
 */
export function createFaker({ salt = '', sourceText = '' } = {}) {
  const used = new Set();
  // Names carried across surface forms so "Sarah Whitfield" and a later bare
  // "Sarah" pseudonymise to the same fictional first name.
  const entityNames = new Map();

  const unique = (make) => {
    for (let attempt = 0; attempt < 64; attempt++) {
      const candidate = make(attempt);
      if (!used.has(candidate) && !sourceText.includes(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
    const fallback = `${make(0)}-${used.size + 1}`;
    used.add(fallback);
    return fallback;
  };

  function nameForEntity(entityId, seed) {
    if (!entityNames.has(entityId)) {
      entityNames.set(entityId, {
        first: pick(FAKE_FIRST, seed),
        last: pick(FAKE_LAST, seed >>> 3),
      });
    }
    return entityNames.get(entityId);
  }

  /**
   * @param {string} type   detector id, uppercased by the caller
   * @param {string} value  the original text being replaced
   * @param {object} meta   { index, entity, part }
   */
  return function fakeFor(type, value, meta = {}) {
    const seed = hash32(salt + type + value);

    switch (type) {
      case 'PERSON': {
        const n = nameForEntity(meta.entity ?? `solo:${value}`, seed);
        return unique((a) => {
          const first = a === 0 ? n.first : `${n.first}${a}`;
          const last = a === 0 ? n.last : `${n.last}${a}`;
          if (meta.part === 'first') return first;
          if (meta.part === 'last') return last;
          return `${first} ${last}`;
        });
      }
      case 'ORG':
        return unique((a) => `${pick(FAKE_ORG_A, seed + a)} ${pick(FAKE_ORG_B, seed >>> 4)}`
          + (a > 1 ? ` ${a}` : ''));
      case 'EMAIL':
        return unique((a) => {
          const n = nameForEntity(meta.entity ?? `mail:${value}`, seed);
          return `${n.first.toLowerCase()}.${n.last.toLowerCase()}${a || ''}@example.com`;
        });
      case 'PHONE':
        return unique((a) => `+1 555-01${digits(seed + a, 2)}`);
      case 'CARD_EXPIRY':
        return unique((a) => `${String(((seed + a) % 12) + 1).padStart(2, '0')}/${28 + ((seed >>> 4) % 6)}`);
      case 'CVV':
        return unique((a) => digits(seed + a, value.replace(/\D/g, '').length === 4 ? 4 : 3));
      case 'SSN':
        return unique((a) => `9${digits(seed + a, 2)}-${digits(seed >>> 5, 2)}-${digits(seed >>> 9, 4)}`);
      case 'CREDIT_CARD':
        return unique((a) => TEST_CARDS[(seed + a) % TEST_CARDS.length] + (a >= TEST_CARDS.length ? ` #${a}` : ''));
      case 'IBAN':
        return unique((a) => `GB29NWBK601613${digits(seed + a, 6)}`);
      case 'ADDRESS':
        return unique((a) => `${100 + ((seed + a) % 899)} ${pick(FAKE_STREET, seed >>> 2)} ${pick(STREET_TYPE, seed >>> 6)}`);
      case 'POSTAL_CODE':
        return unique((a) => `${90000 + ((seed + a) % 999)}`);
      case 'IP_ADDRESS':
        return unique((a) => `203.0.113.${(seed + a) % 254 + 1}`);
      case 'MAC_ADDRESS':
        // 02:00:5e is a locally administered prefix, so the result is never a
        // real vendor's assigned range.
        return unique((a) => `02:00:5e:${digits(seed + a, 2)}:${digits(seed >>> 4, 2)}:${digits(seed >>> 8, 2)}`);
      case 'URL':
      case 'URL_WITH_SECRET':
        return unique((a) => `https://example.com/resource/${seed % 100000}${a || ''}`);
      case 'HOSTNAME':
        return unique((a) => `host-${seed % 1000}${a || ''}.example.internal`);
      case 'DATE_OF_BIRTH':
      case 'DATE':
        return unique((a) => {
          const y = 1960 + ((seed + a) % 45);
          const m = String(((seed >>> 3) % 12) + 1).padStart(2, '0');
          const d = String(((seed >>> 7) % 28) + 1).padStart(2, '0');
          return `${y}-${m}-${d}`;
        });
      case 'SOCIAL_HANDLE':
        return unique((a) => `user${(seed + a) % 100000}`);
      default: {
        // Anything without a natural fake keeps a readable synthetic id that is
        // still obviously not real data.
        const label = type.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return unique((a) => `${label}-${(seed + a) % 1000000}`);
      }
    }
  };
}
