import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

// Serif face for the "editorial" headings (brand, restaurant names, titles).
// Georgia is a built-in system serif, so no font install is needed for now —
// later we can swap in a nicer Google Font (e.g. Lora) via expo-font.
const SERIF = 'Georgia';

// One dish on a menu: a name and a price (in RM).
type MenuItem = {
  name: string;
  price: number;
};

// A "type" describes the SHAPE of one restaurant, so the editor warns us
// if we mistype a field (e.g. ".cusine"). This is the TypeScript part.
type Restaurant = {
  id: string;
  emoji: string;
  name: string;
  cuisine: string;       // e.g. 'Malaysian', 'Chinese', 'Western'
  halal: boolean;        // true / false — a yes-or-no value
  priceLevel: 1 | 2 | 3; // 1 = cheap ($), 2 = mid ($$), 3 = pricey ($$$)
  distanceKm: number;
  googleRating: number;  // out of 5, from Google
  userRating: number;    // out of 5, from MakanMana users
  menu: MenuItem[];      // the dishes — we curate these by hand, one shop at a time
};

// 1) THE DATA — real eateries in Taman Connaught, the small area beside UCSI
//    (read off the map). cuisine / halal / price / ratings are PLACEHOLDER
//    values for now — verify the real ones later (Google ratings will come
//    from the Google Places API). menu[] starts empty until we curate it.
const RESTAURANTS: Restaurant[] = [
  {
    id: '1', emoji: '🍟', name: "McDonald's Taman Connaught DT", cuisine: 'Fast Food',
    halal: true, priceLevel: 1, distanceKm: 0.4, googleRating: 4.1, userRating: 4.0,
    // ⚠️ SAMPLE MENU — replace with verified items & prices.
    menu: [
      { name: 'McChicken', price: 9.55 },
      { name: 'Big Mac', price: 12.10 },
      { name: 'Fries (Medium)', price: 6.30 },
      { name: 'McFlurry Oreo', price: 7.45 },
    ],
  },
  {
    id: '2', emoji: '🍛', name: 'Restoran Gading Nasi Kandar', cuisine: 'Malaysian',
    halal: true, priceLevel: 1, distanceKm: 0.5, googleRating: 4.0, userRating: 4.2,
    menu: [], // to curate
  },
  {
    id: '3', emoji: '🍜', name: 'Tai Jie Taman Connaught', cuisine: 'Taiwanese',
    halal: false, priceLevel: 2, distanceKm: 0.5, googleRating: 4.3, userRating: 4.4,
    menu: [], // to curate
  },
  {
    id: '4', emoji: '☕', name: 'Craft Cafe', cuisine: 'Café',
    halal: false, priceLevel: 2, distanceKm: 0.4, googleRating: 4.4, userRating: 4.5,
    menu: [], // to curate
  },
  {
    id: '5', emoji: '🥙', name: 'Shawarma Restaurant', cuisine: 'Middle Eastern',
    halal: true, priceLevel: 2, distanceKm: 0.6, googleRating: 4.2, userRating: 4.3,
    menu: [], // to curate
  },
];

// Build the list of cuisine buttons from the data itself: 'All' first, then
// each unique cuisine. (new Set throws away duplicates; Array.from turns it
// back into an array we can .map() over.) Deriving it means new restaurants
// automatically get a button — we never hand-maintain this list.
const CUISINES = ['All', ...Array.from(new Set(RESTAURANTS.map((r) => r.cuisine)))];

// Price filter options. 0 means "Any price"; 1/2/3 match priceLevel.
const PRICE_OPTIONS = [0, 1, 2, 3];

// HELPER FUNCTIONS
function priceLabel(level: number) {
  return '$'.repeat(level); // priceLevel 2 -> "$$"
}
function ringgit(amount: number) {
  return 'RM ' + amount.toFixed(2); // 9.5 -> "RM 9.50"
}

// A reusable tappable "pill" button for the filter bar.
function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

// THE CARD — now tappable. onPress is a function the parent passes in;
// tapping the card runs it (to open the detail screen).
function RestaurantCard({
  restaurant,
  onPress,
  isFav,
  onToggleFav,
}: {
  restaurant: Restaurant;
  onPress: () => void;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  // The card is a plain View so we can have TWO separate tap targets inside it:
  // the main area (opens the detail screen) and the heart (toggles favourite).
  return (
    <View style={styles.card}>
      <Pressable style={styles.cardMain} onPress={onPress}>
        {/* Monogram tile stands in for a photo — the restaurant's initial */}
        <View style={styles.cardThumb}>
          <Text style={styles.cardThumbText}>{restaurant.name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.name}>{restaurant.name}</Text>

          <View style={styles.tagRow}>
            <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.price}>{priceLabel(restaurant.priceLevel)}</Text>
            {restaurant.halal && <Text style={styles.halalBadge}>Halal</Text>}
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.rating}>
              <Text style={styles.star}>★ </Text>
              {restaurant.googleRating} Google
            </Text>
            <Text style={styles.rating}>{restaurant.userRating} users</Text>
          </View>

          <Text style={styles.meta}>{restaurant.distanceKm} km away</Text>
        </View>
      </Pressable>

      {/* Heart: ♥ when saved, ♡ when not */}
      <Pressable style={styles.heart} onPress={onToggleFav} hitSlop={8}>
        <Text style={[styles.heartIcon, isFav && styles.heartActive]}>{isFav ? '♥' : '♡'}</Text>
      </Pressable>
    </View>
  );
}

// THE DETAIL SCREEN — shown when a restaurant is open. onBack closes it.
function DetailScreen({
  restaurant,
  onBack,
  isFav,
  onToggleFav,
}: {
  restaurant: Restaurant;
  onBack: () => void;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{restaurant.name}</Text>
        <Text style={styles.headerSubtitle}>
          {restaurant.cuisine} · {priceLabel(restaurant.priceLevel)} ·{' '}
          {restaurant.distanceKm} km away
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.detailBody}>
        {/* Info row */}
        <View style={styles.detailInfoRow}>
          <Text style={styles.rating}>
            <Text style={styles.star}>★ </Text>
            {restaurant.googleRating} Google
          </Text>
          <Text style={styles.rating}>{restaurant.userRating} users</Text>
          {restaurant.halal && <Text style={styles.halalBadge}>Halal</Text>}
        </View>

        {/* Save toggle — fills in when saved */}
        <Pressable
          style={[styles.saveBtn, isFav && styles.saveBtnActive]}
          onPress={onToggleFav}
        >
          <Text style={[styles.saveBtnText, isFav && styles.saveBtnTextActive]}>
            {isFav ? '♥  Saved' : '♡  Save to favourites'}
          </Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Menu</Text>

        {/* If we've curated a menu, list each item; otherwise show a note. */}
        {restaurant.menu.length === 0 ? (
          <Text style={styles.empty}>Menu coming soon.</Text>
        ) : (
          restaurant.menu.map((item) => (
            <View key={item.name} style={styles.menuRow}>
              <Text style={styles.menuName}>{item.name}</Text>
              <Text style={styles.menuPrice}>{ringgit(item.price)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <StatusBar style="auto" />
    </View>
  );
}

// A registered account. In this PROTOTYPE we keep accounts in memory only, so
// they reset when the app reloads. A real app would store them in a backend
// database (Supabase/Firebase) — a documented limitation for the FYP.
type Account = {
  name: string;
  email: string;
  password: string;
  joinedAt: number; // when they signed up (Date.now()), for "Member since"
};

// THE AUTH SCREEN — shown when nobody is logged in. It flips between "Log in"
// and "Sign up" modes, and reports errors back to the user. It doesn't touch
// the account list itself — it calls onLogin / onSignup, which return an error
// message (a string) or null when everything worked.
function AuthScreen({
  onLogin,
  onSignup,
}: {
  onLogin: (email: string, password: string) => string | null;
  onSignup: (name: string, email: string, password: string) => string | null;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';

  function submit() {
    // Basic validation before we try anything.
    if (isSignup && name.trim() === '') return setError('Please enter your name.');
    if (email.trim() === '') return setError('Please enter your email.');
    if (password === '') return setError('Please enter a password.');

    // Run the matching handler; null means success, a string is the error.
    const problem = isSignup
      ? onSignup(name.trim(), email.trim(), password)
      : onLogin(email.trim(), password);
    if (problem) setError(problem);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.authWrap}>
        <Text style={styles.authLogo}>MakanMana</Text>
        <Text style={styles.authTagline}>Where to eat near UCSI</Text>

        <View style={styles.authCard}>
          <Text style={styles.authTitle}>{isSignup ? 'Create account' : 'Welcome back'}</Text>

          {/* Name field only exists in sign-up mode */}
          {isSignup && (
            <TextInput
              style={styles.authInput}
              placeholder="Name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.authInput}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.authInput}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Show the error only when there is one */}
          {error !== '' && <Text style={styles.authError}>{error}</Text>}

          <Pressable style={styles.authButton} onPress={submit}>
            <Text style={styles.authButtonText}>{isSignup ? 'Sign up' : 'Log in'}</Text>
          </Pressable>

          {/* Switch between the two modes; clear any stale error when we do */}
          <Pressable
            onPress={() => {
              setMode(isSignup ? 'login' : 'signup');
              setError('');
            }}
          >
            <Text style={styles.authSwitch}>
              {isSignup ? 'Already have an account? Log in' : 'New here? Create an account'}
            </Text>
          </Pressable>
        </View>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

// THE PROFILE / ACCOUNT SCREEN — the user's dashboard. Shows their details,
// account status, and activity stats, and lets them edit their name or log out.
function ProfileScreen({
  user,
  favourites,
  onOpenRestaurant,
  onUpdateName,
  onLogout,
  onBack,
}: {
  user: Account;
  favourites: Restaurant[];
  onOpenRestaurant: (restaurant: Restaurant) => void;
  onUpdateName: (name: string) => void;
  onLogout: () => void;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.name);

  function save() {
    if (draftName.trim() === '') return; // ignore an empty name
    onUpdateName(draftName.trim());
    setEditing(false);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.detailBody}>
        {/* Avatar + name + email */}
        <View style={styles.profileTop}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarBigText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>

          {editing ? (
            <TextInput
              style={[styles.authInput, styles.nameInput]}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your name"
              placeholderTextColor="#94a3b8"
            />
          ) : (
            <Text style={styles.profileName}>{user.name}</Text>
          )}
          <Text style={styles.profileEmail}>{user.email}</Text>
        </View>

        {editing ? (
          <Pressable style={styles.profileBtn} onPress={save}>
            <Text style={styles.profileBtnText}>Save name</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.profileBtnOutline}
            onPress={() => {
              setDraftName(user.name);
              setEditing(true);
            }}
          >
            <Text style={styles.profileBtnOutlineText}>Edit name</Text>
          </Pressable>
        )}

        {/* Account info */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.statusActive}>● Active</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Member since</Text>
            <Text style={styles.infoValue}>{new Date(user.joinedAt).toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Activity — Favourites is now REAL (driven by the shared state) */}
        <Text style={styles.sectionTitle}>My activity</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{favourites.length}</Text>
            <Text style={styles.statLabel}>Favourites</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Saved places list */}
        <Text style={styles.sectionTitle}>Saved places</Text>
        {favourites.length === 0 ? (
          <Text style={styles.hint}>Tap the heart on any restaurant to save it here.</Text>
        ) : (
          favourites.map((r) => (
            <Pressable key={r.id} style={styles.savedRow} onPress={() => onOpenRestaurant(r)}>
              <View style={styles.savedThumb}>
                <Text style={styles.savedThumbText}>{r.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.savedName}>{r.name}</Text>
                <Text style={styles.savedMeta}>
                  {r.cuisine} · {priceLabel(r.priceLevel)}
                </Text>
              </View>
              <Text style={styles.savedChevron}>›</Text>
            </Pressable>
          ))
        )}

        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Log out</Text>
        </Pressable>
      </ScrollView>

      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  // FILTER state
  const [query, setQuery] = useState('');  // what the user typed in the search box
  const [halalOnly, setHalalOnly] = useState(false);
  const [cuisine, setCuisine] = useState('All');
  const [price, setPrice] = useState(0); // 0 = Any

  // NAVIGATION state: which restaurant is open? null = none (show the list).
  const [selected, setSelected] = useState<Restaurant | null>(null);

  // AUTH state
  const [accounts, setAccounts] = useState<Account[]>([]); // everyone who signed up (in memory)
  const [user, setUser] = useState<Account | null>(null);  // who's logged in? null = nobody
  const [showProfile, setShowProfile] = useState(false);   // is the account screen open?

  // FAVOURITES — one shared list of saved restaurant ids, read by the list,
  // the detail screen, and the profile. This is the "single source of truth".
  const [favourites, setFavourites] = useState<string[]>([]);
  function toggleFavourite(id: string) {
    setFavourites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Sign up: reject a duplicate email, otherwise save the account and log in.
  function handleSignup(name: string, email: string, password: string) {
    if (accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      return 'That email is already registered.';
    }
    const account = { name, email, password, joinedAt: Date.now() }; // stamp the join date
    setAccounts([...accounts, account]); // add to the list (spread keeps the old ones)
    setUser(account);                    // log them straight in
    return null;                         // null = no error
  }

  // Log in: find an account whose email + password both match.
  function handleLogin(email: string, password: string) {
    const account = accounts.find(
      (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
    );
    if (!account) return 'Wrong email or password.';
    setUser(account);
    return null;
  }

  // Edit the logged-in user's name in BOTH the live user and the saved list.
  // .map() rebuilds the array, swapping in the updated account for the old one.
  function handleUpdateName(newName: string) {
    if (!user) return;
    const updated = { ...user, name: newName }; // copy the account, change the name
    setUser(updated);
    setAccounts(accounts.map((a) => (a.email === user.email ? updated : a)));
  }

  // Nobody logged in yet -> show only the auth screen.
  if (!user) {
    return <AuthScreen onLogin={handleLogin} onSignup={handleSignup} />;
  }

  // Account screen open -> show it instead of the list.
  if (showProfile) {
    return (
      <ProfileScreen
        user={user}
        favourites={RESTAURANTS.filter((r) => favourites.includes(r.id))}
        onOpenRestaurant={(r) => {
          setShowProfile(false);
          setSelected(r);
        }}
        onUpdateName={handleUpdateName}
        onLogout={() => {
          setShowProfile(false);
          setUser(null);
        }}
        onBack={() => setShowProfile(false)}
      />
    );
  }

  // If a restaurant is open, show its detail screen instead of the list.
  if (selected) {
    return (
      <DetailScreen
        restaurant={selected}
        onBack={() => setSelected(null)}
        isFav={favourites.includes(selected.id)}
        onToggleFav={() => toggleFavourite(selected.id)}
      />
    );
  }

  // THE FILTER — keep only restaurants that pass every active filter.
  const visible = RESTAURANTS.filter((r) => {
    // Search: keep only names that contain what was typed.
    // .toLowerCase() on both sides makes it case-insensitive; .trim() drops
    // stray spaces. An empty query passes everything (every string includes "").
    if (!r.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (halalOnly && !r.halal) return false;
    if (cuisine !== 'All' && r.cuisine !== cuisine) return false;
    if (price !== 0 && r.priceLevel !== price) return false;
    return true;
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {/* Tapping the avatar / name opens the account dashboard */}
          <Pressable style={styles.profileTap} onPress={() => setShowProfile(true)}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.greeting}>Hi, {user.name}</Text>
          </Pressable>
          <Pressable onPress={() => setUser(null)}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        </View>
        <Text style={styles.brand}>MakanMana</Text>
        <Text style={styles.headerSubtitle}>Where to eat near UCSI</Text>
      </View>

      {/* FILTER BAR */}
      <View style={styles.filterBar}>
        {/* Search box: value shows the state, onChangeText updates it on every
            keystroke, which re-runs the filter and re-draws the list. */}
        <TextInput
          style={styles.search}
          placeholder="Search restaurants…"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
        />

        <View style={styles.filterRow}>
          <FilterPill
            label="Halal only"
            active={halalOnly}
            onPress={() => setHalalOnly(!halalOnly)}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {CUISINES.map((c) => (
              <FilterPill key={c} label={c} active={cuisine === c} onPress={() => setCuisine(c)} />
            ))}
          </View>
        </ScrollView>

        <View style={[styles.filterRow, styles.lastRow]}>
          {PRICE_OPTIONS.map((p) => (
            <FilterPill
              key={p}
              label={p === 0 ? 'Any price' : priceLabel(p)}
              active={price === p}
              onPress={() => setPrice(p)}
            />
          ))}
        </View>
      </View>

      {/* THE LIST — tapping a card opens it by storing it in `selected` */}
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.count}>
          {visible.length} {visible.length === 1 ? 'place' : 'places'}
        </Text>

        {visible.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            onPress={() => setSelected(restaurant)}
            isFav={favourites.includes(restaurant.id)}
            onToggleFav={() => toggleFavourite(restaurant.id)}
          />
        ))}

        {visible.length === 0 && (
          <Text style={styles.empty}>No places match these filters.</Text>
        )}
      </ScrollView>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf6f0', // warm cream page
  },
  header: {
    backgroundColor: '#faf6f0',
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ece2d4',
  },
  back: {
    color: '#c2410c',
    fontSize: 15,
    marginBottom: 12,
    fontWeight: '600',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#efe4d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    fontFamily: SERIF,
    color: '#c2410c',
    fontWeight: 'bold',
    fontSize: 15,
  },
  greeting: {
    color: '#3b2f26',
    fontSize: 14,
    fontWeight: '600',
  },
  logout: {
    color: '#a1917f',
    fontSize: 13,
    fontWeight: '600',
  },
  // List brand title (serif)
  brand: {
    fontFamily: SERIF,
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2b2019',
    letterSpacing: 0.2,
  },
  // Profile / account screen
  profileTop: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarBig: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: '#efe4d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarBigText: {
    fontFamily: SERIF,
    color: '#c2410c',
    fontWeight: 'bold',
    fontSize: 34,
  },
  profileName: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2b2019',
  },
  profileEmail: {
    fontSize: 14,
    color: '#8a7b6c',
    marginTop: 2,
  },
  nameInput: {
    minWidth: 220,
    textAlign: 'center',
    marginBottom: 0,
  },
  profileBtn: {
    backgroundColor: '#c2410c',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  profileBtnText: {
    color: '#fdf6ee',
    fontSize: 15,
    fontWeight: 'bold',
  },
  profileBtnOutline: {
    borderWidth: 1,
    borderColor: '#dcc9b0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  profileBtnOutlineText: {
    color: '#c2410c',
    fontSize: 15,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#fffdfa',
    borderWidth: 1,
    borderColor: '#ece2d4',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f2ebdf',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8a7b6c',
  },
  infoValue: {
    fontSize: 14,
    color: '#2b2019',
    fontWeight: '600',
  },
  statusActive: {
    fontSize: 14,
    color: '#5f7a4d',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fffdfa',
    borderWidth: 1,
    borderColor: '#ece2d4',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: SERIF,
    fontSize: 26,
    fontWeight: 'bold',
    color: '#c2410c',
  },
  statLabel: {
    fontSize: 13,
    color: '#8a7b6c',
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    color: '#b3a695',
    marginTop: 10,
  },
  logoutBtn: {
    backgroundColor: '#f6e9e2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  logoutBtnText: {
    color: '#b04a2f',
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Auth screen
  authWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  authLogo: {
    fontFamily: SERIF,
    fontSize: 34,
    fontWeight: 'bold',
    color: '#c2410c',
    textAlign: 'center',
  },
  authTagline: {
    fontSize: 14,
    color: '#8a7b6c',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 28,
  },
  authCard: {
    backgroundColor: '#fffdfa',
    borderWidth: 1,
    borderColor: '#ece2d4',
    borderRadius: 20,
    padding: 22,
  },
  authTitle: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2b2019',
    marginBottom: 16,
  },
  authInput: {
    backgroundColor: '#f6efe4',
    borderWidth: 1,
    borderColor: '#e4d8c6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2b2019',
    marginBottom: 12,
  },
  authError: {
    color: '#b04a2f',
    fontSize: 13,
    marginBottom: 12,
  },
  authButton: {
    backgroundColor: '#c2410c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  authButtonText: {
    color: '#fdf6ee',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authSwitch: {
    color: '#c2410c',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontFamily: SERIF,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2b2019',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8a7b6c',
    marginTop: 4,
  },
  filterBar: {
    backgroundColor: '#faf6f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ece2d4',
  },
  search: {
    backgroundColor: '#fffdfa',
    borderWidth: 1,
    borderColor: '#e4d8c6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2b2019',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  lastRow: {
    marginBottom: 0,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#fffdfa',
    borderWidth: 1,
    borderColor: '#e4d8c6',
  },
  pillActive: {
    backgroundColor: '#c2410c',
    borderColor: '#c2410c',
  },
  pillText: {
    fontSize: 13,
    color: '#8a7b6c',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fdf6ee',
  },
  list: {
    padding: 16,
  },
  count: {
    fontSize: 12,
    color: '#a1917f',
    marginBottom: 10,
    marginLeft: 2,
  },
  empty: {
    fontSize: 14,
    color: '#b3a695',
    textAlign: 'center',
    marginTop: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fffdfa',
    borderWidth: 1,
    borderColor: '#ece2d4',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heart: {
    paddingLeft: 10,
    paddingVertical: 4,
  },
  heartIcon: {
    fontSize: 22,
    color: '#cbb9a4',
  },
  heartActive: {
    color: '#c2410c',
  },
  saveBtn: {
    borderWidth: 1,
    borderColor: '#dcc9b0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveBtnActive: {
    backgroundColor: '#c2410c',
    borderColor: '#c2410c',
  },
  saveBtnText: {
    color: '#c2410c',
    fontSize: 15,
    fontWeight: 'bold',
  },
  saveBtnTextActive: {
    color: '#fdf6ee',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdfa',
    borderWidth: 1,
    borderColor: '#ece2d4',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  savedThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#efe4d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedThumbText: {
    fontFamily: SERIF,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c2410c',
  },
  savedName: {
    fontFamily: SERIF,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2b2019',
  },
  savedMeta: {
    fontSize: 12,
    color: '#8a7b6c',
    marginTop: 2,
  },
  savedChevron: {
    fontSize: 22,
    color: '#c9bba9',
    paddingHorizontal: 6,
  },
  cardThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#efe4d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardThumbText: {
    fontFamily: SERIF,
    fontSize: 26,
    fontWeight: 'bold',
    color: '#c2410c',
  },
  cardBody: {
    flex: 1,
  },
  name: {
    fontFamily: SERIF,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2b2019',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  cuisine: {
    fontSize: 13,
    color: '#8a7b6c',
  },
  dot: {
    fontSize: 13,
    color: '#c9bba9',
  },
  price: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#c2410c',
  },
  halalBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#5f7a4d',
    backgroundColor: '#e8efdf',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    marginLeft: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  star: {
    color: '#c2410c',
  },
  rating: {
    fontSize: 13,
    color: '#5c5044',
  },
  meta: {
    fontSize: 12,
    color: '#b3a695',
    marginTop: 6,
  },
  // Detail screen
  detailBody: {
    padding: 16,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 19,
    fontWeight: 'bold',
    color: '#2b2019',
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fffdfa',
    borderWidth: 1,
    borderColor: '#ece2d4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  menuName: {
    fontSize: 15,
    color: '#2b2019',
  },
  menuPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#c2410c',
  },
});
