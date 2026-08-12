/* Hallmark · genre: modern-minimal · theme: Verdant (custom) · design-system: design.md
 * designed-as-app · nav: bottom tab bar (label-only) · motion: press-states only
 * Principle: SELECTION IS INK, ACTION IS GREEN — accent stays under ~5% of screen.
 * Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from './supabase';
import { color, fontFamily, radius, size, space, weight } from './theme';

// Local storage now holds only the language preference; accounts, favourites,
// reviews and bookings live on the server.
const STORAGE_KEY = 'makanmana';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type MenuItem = { name: string; price: number };

// Several fields are nullable, and null means "not yet confirmed" rather than
// "no". This matters most for halal: recording an unverified restaurant as
// non-halal would actively mislead the users who depend on the field, and
// recording it as halal would be worse. The interface therefore distinguishes
// confirmed halal, confirmed not halal, and unconfirmed. The same reasoning
// applies to ratings, prices, distances and hours: the application shows
// nothing rather than a value it cannot support.
type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  halal: boolean | null;
  priceLevel: 1 | 2 | 3 | null;
  distanceKm: number | null;
  googleRating: number | null;
  address: string | null;
  hours: string | null;
  // Coordinates from OpenStreetMap via scripts/fetch-locations.js. distanceKm
  // is measured from the campus using them, not estimated.
  latitude: number | null;
  longitude: number | null;
  tags: string[];       // dietary tags, e.g. 'Vegetarian'; empty = none confirmed
  menu: MenuItem[];
};

// UCSI University, resolved from OpenStreetMap. All distances are measured from
// this point.
const CAMPUS = { latitude: 3.0789392, longitude: 101.7326363 };

type Review = {
  id: string;
  restaurantId: string;
  userId: string;
  author: string;   // display name, joined from the author's profile
  rating: number;
  text: string;
  at: number;
};

// Bookings and favourites carry no owner field: the database's Row Level
// Security policies scope every query to the signed-in account, so anything
// returned already belongs to that user.
type Booking = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  day: string;
  time: string;
  partySize: number;
  at: number;
};

type ChatMsg = { from: 'user' | 'bot'; text: string; results?: Restaurant[] };

// The signed-in user. No password field: credentials are held and verified by
// Supabase Auth, so the application never stores or sees them.
type Account = { id: string; name: string; email: string; joinedAt: number };

type Tab = 'explore' | 'saved' | 'chat' | 'profile';

// ─── DATA ─────────────────────────────────────────────────────────────────────
// Real eateries in Taman Connaught, the small area beside UCSI.
//
// VERIFIED (from OpenStreetMap via scripts/fetch-locations.js): the address,
// coordinates and distance of Gading Nasi Kandar, Craft Cafe and Restoran
// Shawarma. Distances are measured from CAMPUS, not estimated.
//
// ⚠️ STILL TO VERIFY: cuisine, halal status, price level, opening hours, and the
//    Google ratings — the Places API was not used, so those ratings must be
//    read from Google Maps by hand (see design.md for why).
// ⚠️ Two entries carry latitude/longitude of 0 as a placeholder: OpenStreetMap
//    has no record of Tai Jie, and it matched a different McDonald's branch.

const RESTAURANTS: Restaurant[] = [
  {
    id: '1', name: "McDonald's Taman Connaught DT", cuisine: 'Fast Food',
    // McDonald's Malaysia holds national JAKIM halal certification, so this is
    // a matter of public record rather than an assumption.
    halal: true, priceLevel: 1,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    id: '2', name: 'Restoran Gading Nasi Kandar', cuisine: 'Malaysian',
    halal: null, priceLevel: null,
    distanceKm: 0.22, googleRating: null,
    address: '41, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: null,
    latitude: 3.08084, longitude: 101.73212,
    tags: [],
    menu: [],
  },
  {
    id: '3', name: 'Tai Jie (台街) Taman Connaught', cuisine: 'Taiwanese',
    halal: null, priceLevel: null,
    distanceKm: 0.19, googleRating: null,
    address: '37-G, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: null,
    latitude: 3.080990, longitude: 101.732160,
    tags: [],
    menu: [],
  },
  {
    id: '4', name: 'Craft Cafe', cuisine: 'Cafe',
    halal: null, priceLevel: null,
    distanceKm: 0.23, googleRating: null,
    address: '7, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: null,
    latitude: 3.08088, longitude: 101.73332,
    tags: [],
    menu: [],
  },
  {
    id: '5', name: 'Restoran Shawarma', cuisine: 'Middle Eastern',
    halal: null, priceLevel: null,
    distanceKm: 0.19, googleRating: null,
    address: '10, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: null,
    latitude: 3.08060, longitude: 101.73318,
    tags: [],
    menu: [],
  },
  {
    id: '6', name: 'Tealive (Shell Taman Connaught)', cuisine: 'Drinks',
    // Tealive holds national JAKIM halal certification.
    halal: true, priceLevel: 1,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    id: '7', name: 'Kashif Pakistani Food Restaurant', cuisine: 'Pakistani',
    halal: null, priceLevel: null,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    id: '8', name: 'Chapathi Recipes', cuisine: 'North Indian',
    halal: null, priceLevel: null,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    id: '9', name: 'Mix And Fuse Restaurant', cuisine: 'Japanese',
    halal: null, priceLevel: null,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    id: '10', name: 'Astarry Cafe', cuisine: 'Cafe',
    halal: null, priceLevel: null,
    distanceKm: 0.19, googleRating: null,
    address: '18, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: null,
    latitude: 3.0806034, longitude: 101.7329389,
    tags: [],
    menu: [],
  },
  {
    // A second Gading outlet, distinct from id 2.
    id: '11', name: 'Nasi Kandar Nj Bistro', cuisine: 'Malaysian',
    halal: null, priceLevel: null,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    // Full record read from the Google Maps place panel: rating 3.5 from 102
    // ratings, and a reported spend of RM 1-20 per person, hence price level 1.
    id: '12', name: 'Ming Yang Kopitiam (名洋美食茶餐)', cuisine: 'Kopitiam',
    halal: null, priceLevel: 1,
    distanceKm: 0.21, googleRating: 3.5,
    address: '24 & 25, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: null,
    latitude: 3.080833, longitude: 101.7327418,
    tags: [],
    menu: [],
  },
  {
    id: '13', name: 'Kungfu Ramen Cheras', cuisine: 'Chinese',
    halal: null, priceLevel: null,
    distanceKm: 0.22, googleRating: null,
    address: '15, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: null,
    latitude: 3.0808318, longitude: 101.733053,
    tags: [],
    menu: [],
  },
  {
    id: '14', name: 'Tai Chong Mix Rice (Taman Connaught)', cuisine: 'Chinese',
    halal: null, priceLevel: null,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    // OpenStreetMap records this as "Spicy Temptation Restaurant"; Google shows
    // "Temptation". Confirm which name to display.
    id: '15', name: 'Temptation Cheras', cuisine: 'Chinese',
    halal: null, priceLevel: null,
    distanceKm: 0.23, googleRating: null,
    address: '47, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: null,
    latitude: 3.0808394, longitude: 101.7319382,
    tags: [],
    menu: [],
  },
  {
    id: '16', name: "Stack'd Burger UC Square", cuisine: 'Fast Food',
    halal: null, priceLevel: null,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    id: '17', name: "Charr'd Charcoal Chicken UC Square", cuisine: 'Grill',
    halal: null, priceLevel: null,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    id: '18', name: 'Muchen Bakehouse', cuisine: 'Bakery',
    halal: null, priceLevel: null,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    id: '19', name: 'Bingxue Taman Connaught', cuisine: 'Dessert',
    halal: null, priceLevel: null,
    distanceKm: 0.22, googleRating: null,
    address: '5, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: null,
    latitude: 3.0808312, longitude: 101.7332312,
    tags: [],
    menu: [],
  },
  {
    // Listed with a cocktail icon, so it most likely serves alcohol. Left
    // unconfirmed rather than asserted either way.
    id: '20', name: 'Max Bar', cuisine: 'Bar',
    halal: null, priceLevel: null,
    distanceKm: null, googleRating: null,
    address: null, hours: null,
    latitude: null, longitude: null,
    tags: [],
    menu: [],
  },
  {
    // Ratings, price band, address and opening time read from the Google Maps
    // place panel for each of the entries below.
    id: '21', name: 'Bep Viet Vietnamese Food (越南厨房)', cuisine: 'Vietnamese',
    halal: null, priceLevel: 2,
    distanceKm: null, googleRating: 4.8,
    address: 'GF-3A, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: 'Opens 11:00',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
  {
    id: '22', name: 'Hua Xiao Zhu Hotpot & BBQ (花小猪火锅烤肉店)', cuisine: 'Asian',
    halal: null, priceLevel: 2,
    distanceKm: null, googleRating: 4.5,
    address: 'No. 8-G, UC Square, Dataran Connaught, Jalan Menara Gading 1, 56000 Kuala Lumpur',
    hours: 'Opens 12:00',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
  {
    id: '23', name: 'Restoran Fook Xing', cuisine: 'Chinese',
    halal: null, priceLevel: 1,
    distanceKm: null, googleRating: 3.8,
    address: '37, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: 'Opens 09:00',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
  {
    id: '24', name: 'Di Guo Jiang Hu (地锅江湖 康乐)', cuisine: 'Chinese',
    halal: null, priceLevel: 3,
    distanceKm: null, googleRating: 5.0,
    address: 'UC Square, GF, 7, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: 'Opens 11:00',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
  {
    // The business advertises itself as halal in its own registered name, so
    // this is the establishment's own declaration rather than an inference.
    id: '25', name: 'Mee Tarik Shepherd Halal Restaurant (牧羊人餐厅)', cuisine: 'Chinese',
    halal: true, priceLevel: 1,
    distanceKm: null, googleRating: 4.4,
    address: 'GF, 10, UC Square, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: 'Opens 11:00',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
  {
    id: '26', name: 'Ma La Shi Dai (麻辣食代)', cuisine: 'Chinese',
    halal: null, priceLevel: 2,
    distanceKm: null, googleRating: 3.9,
    address: '29, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: 'Opens 11:00',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
  {
    // Listed by the business as non-halal in its own registered name.
    // Price band reported as RM 20-60, which straddles two levels; recorded as
    // the lower of the two.
    id: '27', name: 'Krua Thai Moo-ka-ta Restaurant (Cheras)', cuisine: 'Thai',
    halal: false, priceLevel: 2,
    distanceKm: null, googleRating: 4.6,
    address: '27, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: 'Opens 11:30',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
  {
    id: '28', name: 'Yihetang (@ Taman Connaught)', cuisine: 'Drinks',
    halal: null, priceLevel: 1,
    distanceKm: null, googleRating: 4.4,
    address: 'GF-12, Dataran Connaught, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: 'Opens 10:00',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
  {
    id: '29', name: 'Luckin Kitchen (外婆家中餐馆 康乐店)', cuisine: 'Chinese',
    halal: null, priceLevel: 1,
    distanceKm: null, googleRating: 4.2,
    address: '23, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: 'Opens 11:00',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
  {
    id: '30', name: 'Crown Luosifen (皇冠螺蛳粉 康乐分店)', cuisine: 'Chinese',
    halal: null, priceLevel: 1,
    distanceKm: null, googleRating: 3.6,
    address: '9, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: 'Opens 10:30',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
  {
    id: '31', name: 'Juicy Fresh Juice Bar (UCSI Taman Connaught)', cuisine: 'Drinks',
    halal: null, priceLevel: null,
    distanceKm: null, googleRating: 4.7,
    address: '49, Jalan Menara Gading 1, 56000 Cheras, Kuala Lumpur',
    hours: 'Opens 10:00',
    latitude: null, longitude: null,
    tags: [], menu: [],
  },
];

// Filter options derived from the data, so new restaurants need no extra wiring.
const CUISINES = ['All', ...Array.from(new Set(RESTAURANTS.map((r) => r.cuisine)))];
const PRICE_OPTIONS = [0, 1, 2, 3]; // 0 = any
const DIET_TAGS = Array.from(new Set(RESTAURANTS.flatMap((r) => r.tags)));

// ─── LANGUAGES ────────────────────────────────────────────────────────────────
// English + Bahasa Melayu + Chinese. A plain dictionary keyed by a short id.
// Restaurant names and cuisines stay untranslated — they are data, not chrome.

type Lang = 'en' | 'ms' | 'zh';

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    tagline: 'Taman Connaught · beside UCSI',
    explore: 'Explore', savedTab: 'Saved', profileTab: 'Profile',
    logout: 'Log out',
    search: 'Search restaurants',
    halalOnly: 'Halal only', all: 'All', anyPrice: 'Any',
    place: 'place', places: 'places',
    noMatch: 'No places match these filters.',
    clearFilters: 'Clear filters',
    kmAway: 'km', back: 'Back',
    saved: 'Saved', saveToFav: 'Save',
    noSaved: 'Nothing saved yet. Tap the heart on any restaurant.',
    menu: 'Menu', menuSoon: 'Menu not added yet.',
    reviews: 'Reviews', reviewWord: 'review', reviewsWord: 'reviews',
    noReviewsYet: 'No reviews yet',
    yourRating: 'Your rating', writeReview: 'Share what you thought (optional)',
    postReview: 'Post review', beFirst: 'No reviews yet — be the first.',
    welcomeBack: 'Welcome back', createAccount: 'Create account',
    name: 'Name', email: 'Email', password: 'Password',
    emailHint: 'you@example.com',
    login: 'Log in', signup: 'Sign up',
    toSignup: 'New here? Create an account', toLogin: 'Already have an account? Log in',
    errName: 'Enter your name.', errEmail: 'Enter your email.',
    errPassword: 'Enter a password.', errDup: 'That email is already registered.',
    errWrong: 'Wrong email or password.', pleaseWait: 'Please wait…',
    errConfirmEmail: 'Account created. Check your email to confirm it, then log in.',
    halal: 'Halal', notHalal: 'Not halal', halalUnconfirmed: 'Halal unconfirmed',
    notConfirmed: 'Not confirmed',
    errOffline: 'Cannot reach the server. Check your connection.',
    myAccount: 'My account', editName: 'Edit name', saveName: 'Save',
    cancel: 'Cancel', yourName: 'Your name',
    account: 'Account', status: 'Status', active: 'Active',
    memberSince: 'Member since', myActivity: 'Activity', favourites: 'Favourites',
    language: 'Language', hours: 'Hours', address: 'Address',
    directions: 'Directions',
    quickFind: 'Quick find',
    chatHello: "Tell me what you feel like — try 'cheap halal cafe'.",
    chatHelp: "Try words like 'cheap', 'halal', 'cafe' or 'taiwanese'.",
    chatNoMatch: 'Nothing matched — try fewer words.',
    chatFound: "Here's what I found:",
    chatPlaceholder: 'cheap halal cafe', chatSend: 'Send',
    bookTable: 'Book a table', bookDay: 'Day', today: 'Today', tomorrow: 'Tomorrow',
    bookTime: 'Time', partySize: 'Party size', people: 'people',
    confirmBooking: 'Confirm booking', bookingConfirmed: 'Booking confirmed',
    bookingNote: 'Prototype booking — no table is actually reserved.',
    done: 'Done', myBookings: 'Bookings', noBookings: 'No bookings yet.',
    vegetarian: 'Vegetarian', vegan: 'Vegan',
  },
  ms: {
    tagline: 'Taman Connaught · sebelah UCSI',
    explore: 'Jelajah', savedTab: 'Disimpan', profileTab: 'Profil',
    logout: 'Log keluar',
    search: 'Cari restoran',
    halalOnly: 'Halal sahaja', all: 'Semua', anyPrice: 'Semua',
    place: 'tempat', places: 'tempat',
    noMatch: 'Tiada tempat sepadan dengan penapis ini.',
    clearFilters: 'Kosongkan penapis',
    kmAway: 'km', back: 'Kembali',
    saved: 'Disimpan', saveToFav: 'Simpan',
    noSaved: 'Belum ada yang disimpan. Ketik hati pada mana-mana restoran.',
    menu: 'Menu', menuSoon: 'Menu belum ditambah.',
    reviews: 'Ulasan', reviewWord: 'ulasan', reviewsWord: 'ulasan',
    noReviewsYet: 'Tiada ulasan lagi',
    yourRating: 'Penilaian anda', writeReview: 'Kongsi pendapat anda (pilihan)',
    postReview: 'Hantar ulasan', beFirst: 'Tiada ulasan lagi — jadilah yang pertama.',
    welcomeBack: 'Selamat kembali', createAccount: 'Cipta akaun',
    name: 'Nama', email: 'E-mel', password: 'Kata laluan',
    emailHint: 'anda@contoh.com',
    login: 'Log masuk', signup: 'Daftar',
    toSignup: 'Baharu di sini? Cipta akaun', toLogin: 'Sudah ada akaun? Log masuk',
    errName: 'Masukkan nama anda.', errEmail: 'Masukkan e-mel anda.',
    errPassword: 'Masukkan kata laluan.', errDup: 'E-mel itu telah didaftarkan.',
    errWrong: 'E-mel atau kata laluan salah.', pleaseWait: 'Sila tunggu…',
    errConfirmEmail: 'Akaun dicipta. Sila sahkan melalui e-mel anda, kemudian log masuk.',
    halal: 'Halal', notHalal: 'Bukan halal', halalUnconfirmed: 'Halal belum disahkan',
    notConfirmed: 'Belum disahkan',
    errOffline: 'Tidak dapat menghubungi pelayan. Sila semak sambungan anda.',
    myAccount: 'Akaun saya', editName: 'Edit nama', saveName: 'Simpan',
    cancel: 'Batal', yourName: 'Nama anda',
    account: 'Akaun', status: 'Status', active: 'Aktif',
    memberSince: 'Ahli sejak', myActivity: 'Aktiviti', favourites: 'Kegemaran',
    language: 'Bahasa', hours: 'Waktu buka', address: 'Alamat',
    directions: 'Arah',
    quickFind: 'Cari pantas',
    chatHello: "Beritahu saya apa yang anda mahu — cuba 'kafe halal murah'.",
    chatHelp: "Cuba perkataan seperti 'murah', 'halal', 'kafe' atau 'taiwan'.",
    chatNoMatch: 'Tiada padanan — cuba kurangkan perkataan.',
    chatFound: 'Ini yang saya jumpa:',
    chatPlaceholder: 'kafe halal murah', chatSend: 'Hantar',
    bookTable: 'Tempah meja', bookDay: 'Hari', today: 'Hari ini', tomorrow: 'Esok',
    bookTime: 'Masa', partySize: 'Bilangan orang', people: 'orang',
    confirmBooking: 'Sahkan tempahan', bookingConfirmed: 'Tempahan disahkan',
    bookingNote: 'Tempahan prototaip — tiada meja sebenar ditempah.',
    done: 'Selesai', myBookings: 'Tempahan', noBookings: 'Tiada tempahan lagi.',
    vegetarian: 'Vegetarian', vegan: 'Vegan',
  },
  zh: {
    tagline: 'Taman Connaught · UCSI 旁',
    explore: '探索', savedTab: '收藏', profileTab: '我的',
    logout: '登出',
    search: '搜索餐厅',
    halalOnly: '仅清真', all: '全部', anyPrice: '不限',
    place: '家', places: '家',
    noMatch: '没有符合这些筛选条件的餐厅。',
    clearFilters: '清除筛选',
    kmAway: '公里', back: '返回',
    saved: '已收藏', saveToFav: '收藏',
    noSaved: '还没有收藏。点击任意餐厅的爱心。',
    menu: '菜单', menuSoon: '菜单尚未添加。',
    reviews: '评论', reviewWord: '条评论', reviewsWord: '条评论',
    noReviewsYet: '暂无评论',
    yourRating: '你的评分', writeReview: '分享你的想法（可选）',
    postReview: '发布评论', beFirst: '暂无评论 — 来做第一个。',
    welcomeBack: '欢迎回来', createAccount: '创建账户',
    name: '姓名', email: '电子邮箱', password: '密码',
    emailHint: 'you@example.com',
    login: '登录', signup: '注册',
    toSignup: '新用户？创建账户', toLogin: '已有账户？登录',
    errName: '请输入姓名。', errEmail: '请输入电子邮箱。',
    errPassword: '请输入密码。', errDup: '该电子邮箱已被注册。',
    errWrong: '电子邮箱或密码错误。', pleaseWait: '请稍候…',
    errConfirmEmail: '账户已创建。请查收邮件完成确认后再登录。',
    halal: '清真', notHalal: '非清真', halalUnconfirmed: '清真状态未确认',
    notConfirmed: '未确认',
    errOffline: '无法连接服务器。请检查网络连接。',
    myAccount: '我的账户', editName: '修改姓名', saveName: '保存',
    cancel: '取消', yourName: '你的姓名',
    account: '账户', status: '状态', active: '活跃',
    memberSince: '注册于', myActivity: '活动', favourites: '收藏',
    language: '语言', hours: '营业时间', address: '地址',
    directions: '路线',
    quickFind: '快速查找',
    chatHello: '告诉我你想吃什么 — 试试 "cheap halal cafe"。',
    chatHelp: '试试 "cheap"、"halal"、"cafe"、"taiwanese" 这类词。',
    chatNoMatch: '没有找到 — 试试减少关键词。',
    chatFound: '为你找到这些：',
    chatPlaceholder: 'cheap halal cafe', chatSend: '发送',
    bookTable: '预订餐桌', bookDay: '日期', today: '今天', tomorrow: '明天',
    bookTime: '时间', partySize: '人数', people: '人',
    confirmBooking: '确认预订', bookingConfirmed: '预订已确认',
    bookingNote: '原型预订 — 并未真正预留餐桌。',
    done: '完成', myBookings: '预订', noBookings: '还没有预订。',
    vegetarian: '素食', vegan: '纯素',
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Returns '' for an unconfirmed price level, so callers can drop it from a
// metadata line rather than printing a placeholder.
function priceLabel(level: number | null) {
  return level === null ? '' : '$'.repeat(level);
}
function ringgit(amount: number) {
  return 'RM ' + amount.toFixed(2);
}
function starString(rating: number) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// Average of a restaurant's in-app reviews, or null when there are none.
// Returning null (rather than the seeded userRating) is deliberate: we never
// present invented data as a real community score. See design.md § Honest data.
function reviewStats(reviews: Review[], restaurantId: string) {
  const mine = reviews.filter((r) => r.restaurantId === restaurantId);
  if (mine.length === 0) return { avg: null as number | null, count: 0 };
  const avg = mine.reduce((sum, r) => sum + r.rating, 0) / mine.length;
  return { avg, count: mine.length };
}

// THE CHATBOT BRAIN — keyword matching, as scoped in the proposal (an LLM
// chatbot is explicit future work). Spots price, halal and cuisine words.
function chatFind(query: string): { matches: Restaurant[]; understood: boolean } {
  const s = query.toLowerCase();

  let halal: boolean | null = null;
  if (/non[- ]?halal/.test(s)) halal = false;
  else if (/halal/.test(s)) halal = true;

  let price: number | null = null;
  if (/cheap|budget|murah/.test(s)) price = 1;
  else if (/expensive|pricey|fancy|mahal/.test(s)) price = 3;

  // Order matters: the first pattern to match wins, so put the more specific
  // cuisines before the broader ones.
  const CUISINE_WORDS: [RegExp, string][] = [
    [/taiwan/, 'Taiwanese'],
    [/pakistan/, 'Pakistani'],
    [/north ?indian|chapathi|chapati|roti|naan|indian/, 'North Indian'],
    [/japan|sushi|ramen|donburi/, 'Japanese'],
    [/nasi|kandar|mamak|malay/, 'Malaysian'],
    [/fast ?food|burger|fries|mcd|mcdonald/, 'Fast Food'],
    [/middle|shawarma|kebab|arab/, 'Middle Eastern'],
    [/caf|kafe|coffee|kopi/, 'Cafe'],
    [/drink|tea|teh|boba|bubble/, 'Drinks'],
  ];
  const cuisineHit = CUISINE_WORDS.find(([re]) => re.test(s));
  const cuisine = cuisineHit ? cuisineHit[1] : null;

  const understood = halal !== null || price !== null || cuisine !== null;
  // As with the filter bar, a halal request only matches a confirmed yes.
  const matches = !understood
    ? []
    : RESTAURANTS.filter(
        (r) =>
          (halal === null || r.halal === halal) &&
          (price === null || r.priceLevel === price) &&
          (cuisine === null || r.cuisine === cuisine)
      );
  return { matches, understood };
}

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

// Chip — SELECTION IS INK. Selected chips go near-black, never accent.
function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        active && s.chipActive,
        pressed && !active && s.chipPressed,
      ]}
    >
      <Text style={[s.chipText, active && s.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// Segmented control — compact alternative to a row of pills. Used for price,
// language and booking day.
function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={s.segTrack}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[s.segItem, on && s.segItemOn]}
          >
            <Text style={[s.segText, on && s.segTextOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.btnPrimary, pressed && s.btnPrimaryPressed]}
    >
      <Text style={s.btnPrimaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  grow,
}: {
  label: string;
  onPress: () => void;
  grow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.btnSecondary,
        grow && s.grow,
        pressed && s.btnSecondaryPressed,
      ]}
    >
      <Text style={s.btnSecondaryText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  ...input
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        placeholderTextColor={color.ink3}
        {...input}
      />
    </View>
  );
}

// A restaurant row — hairline separated, not a bordered card. The name gets the
// full width; metadata sits beneath in two quiet lines.
function RestaurantRow({
  restaurant,
  avg,
  count,
  isFav,
  onPress,
  onToggleFav,
  t,
}: {
  restaurant: Restaurant;
  avg: number | null;
  count: number;
  isFav: boolean;
  onPress: () => void;
  onToggleFav: () => void;
  t: (k: string) => string;
}) {
  // Only confirmed values appear; unknown ones are dropped rather than shown
  // as a blank or a placeholder.
  const meta = [
    restaurant.cuisine,
    priceLabel(restaurant.priceLevel),
    restaurant.distanceKm === null ? '' : `${restaurant.distanceKm} ${t('kmAway')}`,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <View style={s.row}>
      <Pressable
        style={({ pressed }) => [s.rowMain, pressed && s.rowPressed]}
        onPress={onPress}
      >
        <Text style={s.rowTitle} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={s.rowMeta} numberOfLines={1}>
          {meta}
        </Text>

        <Text style={s.rowMeta} numberOfLines={1}>
          {avg !== null ? (
            <>
              <Text style={s.star}>★ </Text>
              <Text style={s.rowRating}>{avg.toFixed(1)}</Text>
              <Text>
                {`  ·  ${count} ${count === 1 ? t('reviewWord') : t('reviewsWord')}`}
              </Text>
            </>
          ) : (
            <Text>{t('noReviewsYet')}</Text>
          )}
          {restaurant.googleRating !== null && (
            <Text>{`  ·  Google ${restaurant.googleRating}`}</Text>
          )}
        </Text>

        <View style={s.badgeRow}>
          {restaurant.halal === true && <Text style={s.badgeHalal}>{t('halal')}</Text>}
          {restaurant.halal === false && (
            <Text style={s.badgeNeutral}>{t('notHalal')}</Text>
          )}
          {restaurant.halal === null && (
            <Text style={s.badgeUnknown}>{t('halalUnconfirmed')}</Text>
          )}
          {restaurant.tags.map((tag) => (
            <Text key={tag} style={s.badgeNeutral}>
              {t(tag.toLowerCase())}
            </Text>
          ))}
        </View>
      </Pressable>

      <Pressable style={s.heartHit} onPress={onToggleFav} hitSlop={8}>
        <Text style={[s.heart, isFav && s.heartOn]}>{isFav ? '♥' : '♡'}</Text>
      </Pressable>
    </View>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

function AuthScreen({
  onLogin,
  onSignup,
  t,
}: {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onSignup: (name: string, email: string, password: string) => Promise<string | null>;
  t: (k: string) => string;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  // Both handlers now reach the server, so the button reports progress and is
  // guarded against a second submission while the first is in flight.
  async function submit() {
    if (busy) return;
    if (isSignup && name.trim() === '') return setError(t('errName'));
    if (email.trim() === '') return setError(t('errEmail'));
    if (password === '') return setError(t('errPassword'));

    setError('');
    setBusy(true);
    const problem = isSignup
      ? await onSignup(name.trim(), email.trim(), password)
      : await onLogin(email.trim(), password);
    setBusy(false);
    if (problem) setError(problem);
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.authWrap}>
        <Text style={s.wordmark}>MakanMana</Text>
        <Text style={s.headerSub}>{t('tagline')}</Text>

        <Text style={s.authTitle}>{isSignup ? t('createAccount') : t('welcomeBack')}</Text>

        {isSignup && (
          <Field
            label={t('name')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}

        <Field
          label={t('email')}
          placeholder={t('emailHint')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Field
          label={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error !== '' && <Text style={s.error}>{error}</Text>}

        <PrimaryButton
          label={busy ? t('pleaseWait') : isSignup ? t('signup') : t('login')}
          onPress={submit}
        />

        <Pressable
          onPress={() => {
            setMode(isSignup ? 'login' : 'signup');
            setError('');
          }}
        >
          <Text style={s.authSwitch}>{isSignup ? t('toLogin') : t('toSignup')}</Text>
        </Pressable>
      </ScrollView>
      <StatusBar style="dark" />
    </View>
  );
}

// ─── DETAIL ───────────────────────────────────────────────────────────────────

function DetailScreen({
  restaurant,
  onBack,
  isFav,
  onToggleFav,
  reviews,
  onAddReview,
  onBookTable,
  t,
}: {
  restaurant: Restaurant;
  onBack: () => void;
  isFav: boolean;
  onToggleFav: () => void;
  reviews: Review[];
  onAddReview: (rating: number, text: string) => void;
  onBookTable: () => void;
  t: (k: string) => string;
}) {
  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText] = useState('');

  function submitReview() {
    if (myRating === 0) return; // rating required, text optional
    onAddReview(myRating, myText.trim());
    setMyRating(0);
    setMyText('');
  }

  // Hand off to Google Maps — the proposal scopes out building our own routing.
  function openDirections() {
    const q = encodeURIComponent(`${restaurant.name}, Taman Connaught, Cheras`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  }

  const avg =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return (
    <View style={s.screen}>
      <View style={s.subHeader}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={s.backLink}>← {t('back')}</Text>
        </Pressable>
        <Text style={s.screenTitle}>{restaurant.name}</Text>
        <Text style={s.headerSub}>
          {[
            restaurant.cuisine,
            priceLabel(restaurant.priceLevel),
            restaurant.distanceKm === null ? '' : `${restaurant.distanceKm} ${t('kmAway')}`,
          ]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>

        <View style={s.badgeRow}>
          {restaurant.halal === true && <Text style={s.badgeHalal}>{t('halal')}</Text>}
          {restaurant.halal === false && (
            <Text style={s.badgeNeutral}>{t('notHalal')}</Text>
          )}
          {restaurant.halal === null && (
            <Text style={s.badgeUnknown}>{t('halalUnconfirmed')}</Text>
          )}
          {restaurant.tags.map((tag) => (
            <Text key={tag} style={s.badgeNeutral}>
              {t(tag.toLowerCase())}
            </Text>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {/* Ratings */}
        <View style={s.ratingBlock}>
          {avg !== null ? (
            <Text style={s.ratingBig}>
              <Text style={s.star}>★ </Text>
              {avg.toFixed(1)}
              <Text style={s.ratingBigSub}>
                {`  ${reviews.length} ${
                  reviews.length === 1 ? t('reviewWord') : t('reviewsWord')
                }`}
              </Text>
            </Text>
          ) : (
            <Text style={s.ratingNone}>{t('noReviewsYet')}</Text>
          )}
          {restaurant.googleRating !== null && (
            <Text style={s.rowMeta}>{`Google ${restaurant.googleRating}`}</Text>
          )}
        </View>

        {/* Primary action, then secondary pair */}
        <PrimaryButton label={t('bookTable')} onPress={onBookTable} />
        <View style={s.btnRow}>
          <SecondaryButton grow label={t('directions')} onPress={openDirections} />
          <SecondaryButton
            grow
            label={isFav ? `♥  ${t('saved')}` : `♡  ${t('saveToFav')}`}
            onPress={onToggleFav}
          />
        </View>

        {/* Hours and address. Each row states plainly when the value has not
            been confirmed, rather than showing an empty field. */}
        <View style={s.infoTable}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>{t('hours')}</Text>
            <Text style={restaurant.hours ? s.infoValue : s.infoValueMuted}>
              {restaurant.hours ?? t('notConfirmed')}
            </Text>
          </View>
          <View style={[s.infoRow, s.infoRowLast]}>
            <Text style={s.infoLabel}>{t('address')}</Text>
            <Text
              style={[
                restaurant.address ? s.infoValue : s.infoValueMuted,
                s.infoValueWrap,
              ]}
            >
              {restaurant.address ?? t('notConfirmed')}
            </Text>
          </View>
        </View>

        {/* Menu */}
        <Text style={s.sectionTitle}>{t('menu')}</Text>
        {restaurant.menu.length === 0 ? (
          <Text style={s.hint}>{t('menuSoon')}</Text>
        ) : (
          <View style={s.listBlock}>
            {restaurant.menu.map((item, i) => (
              <View
                key={item.name}
                style={[s.menuRow, i === restaurant.menu.length - 1 && s.infoRowLast]}
              >
                <Text style={s.menuName}>{item.name}</Text>
                <Text style={s.menuPrice}>{ringgit(item.price)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Reviews */}
        <Text style={s.sectionTitle}>{t('reviews')}</Text>

        <View style={s.card}>
          <Text style={s.fieldLabel}>{t('yourRating')}</Text>
          <View style={s.starPickRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setMyRating(n)} hitSlop={4}>
                <Text style={[s.starPick, n <= myRating && s.starPickOn]}>
                  {n <= myRating ? '★' : '☆'}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder={t('writeReview')}
            placeholderTextColor={color.ink3}
            value={myText}
            onChangeText={setMyText}
            multiline
          />
          <PrimaryButton label={t('postReview')} onPress={submitReview} />
        </View>

        {reviews.length === 0 ? (
          <Text style={s.hint}>{t('beFirst')}</Text>
        ) : (
          <View style={s.listBlock}>
            {reviews.map((r, i) => (
              <View
                key={r.id}
                style={[s.reviewRow, i === reviews.length - 1 && s.infoRowLast]}
              >
                <View style={s.reviewHead}>
                  <Text style={s.reviewAuthor}>{r.author}</Text>
                  <Text style={s.reviewStars}>{starString(r.rating)}</Text>
                </View>
                {r.text !== '' && <Text style={s.reviewText}>{r.text}</Text>}
                <Text style={s.reviewDate}>
                  {new Date(r.at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <StatusBar style="dark" />
    </View>
  );
}

// ─── BOOKING ──────────────────────────────────────────────────────────────────

const TIME_SLOTS = ['11:30', '12:30', '13:30', '18:30', '19:30', '20:30'];

function BookingScreen({
  restaurant,
  t,
  onBack,
  onBook,
}: {
  restaurant: Restaurant;
  t: (k: string) => string;
  onBack: () => void;
  onBook: (day: string, time: string, partySize: number) => void;
}) {
  const [day, setDay] = useState('today');
  const [time, setTime] = useState('19:30');
  const [partySize, setPartySize] = useState(2);
  const [confirmed, setConfirmed] = useState(false);

  function confirm() {
    onBook(day, time, partySize);
    setConfirmed(true);
  }

  return (
    <View style={s.screen}>
      <View style={s.subHeader}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={s.backLink}>← {t('back')}</Text>
        </Pressable>
        <Text style={s.screenTitle}>{t('bookTable')}</Text>
        <Text style={s.headerSub}>{restaurant.name}</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {confirmed ? (
          <View style={s.card}>
            <View style={s.tickWrap}>
              <Text style={s.tick}>✓</Text>
            </View>
            <Text style={s.confirmTitle}>{t('bookingConfirmed')}</Text>
            <View style={s.infoTable}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{restaurant.name}</Text>
                <Text style={s.infoValue}>{t(day)}</Text>
              </View>
              <View style={[s.infoRow, s.infoRowLast]}>
                <Text style={s.infoLabel}>{time}</Text>
                <Text style={s.infoValue}>
                  {partySize} {t('people')}
                </Text>
              </View>
            </View>
            <Text style={s.hint}>{t('bookingNote')}</Text>
            <PrimaryButton label={t('done')} onPress={onBack} />
          </View>
        ) : (
          <>
            <Text style={s.sectionTitle}>{t('bookDay')}</Text>
            <Segmented
              value={day}
              onChange={setDay}
              options={[
                { key: 'today', label: t('today') },
                { key: 'tomorrow', label: t('tomorrow') },
              ]}
            />

            <Text style={[s.sectionTitle, s.sectionGap]}>{t('bookTime')}</Text>
            <View style={s.chipWrap}>
              {TIME_SLOTS.map((slot) => (
                <Chip
                  key={slot}
                  label={slot}
                  active={time === slot}
                  onPress={() => setTime(slot)}
                />
              ))}
            </View>

            <Text style={[s.sectionTitle, s.sectionGap]}>{t('partySize')}</Text>
            <View style={s.stepperRow}>
              <Pressable
                style={({ pressed }) => [s.stepBtn, pressed && s.btnSecondaryPressed]}
                onPress={() => setPartySize((n) => Math.max(1, n - 1))}
              >
                <Text style={s.stepBtnText}>−</Text>
              </Pressable>
              <Text style={s.stepValue}>
                {partySize} {t('people')}
              </Text>
              <Pressable
                style={({ pressed }) => [s.stepBtn, pressed && s.btnSecondaryPressed]}
                onPress={() => setPartySize((n) => Math.min(12, n + 1))}
              >
                <Text style={s.stepBtnText}>+</Text>
              </Pressable>
            </View>

            <View style={s.sectionGap}>
              <PrimaryButton label={t('confirmBooking')} onPress={confirm} />
            </View>
          </>
        )}
      </ScrollView>

      <StatusBar style="dark" />
    </View>
  );
}

// ─── QUICK FIND (CHAT) ────────────────────────────────────────────────────────

function ChatScreen({
  t,
  onOpenRestaurant,
}: {
  t: (k: string) => string;
  onOpenRestaurant: (restaurant: Restaurant) => void;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ from: 'bot', text: t('chatHello') }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  function send() {
    const q = input.trim();
    if (q === '') return;
    const { matches, understood } = chatFind(q);
    const replyText = !understood
      ? t('chatHelp')
      : matches.length === 0
        ? t('chatNoMatch')
        : t('chatFound');
    setMsgs((prev) => [
      ...prev,
      { from: 'user', text: q },
      { from: 'bot', text: replyText, results: understood ? matches.slice(0, 5) : undefined },
    ]);
    setInput('');
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.wordmark}>{t('quickFind')}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.chatBody}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {msgs.map((m, i) => (
          <View key={i}>
            <View style={m.from === 'user' ? s.bubbleUser : s.bubbleBot}>
              <Text style={m.from === 'user' ? s.bubbleUserText : s.bubbleBotText}>
                {m.text}
              </Text>
            </View>

            {m.results && m.results.length > 0 && (
              <View style={s.listBlock}>
                {m.results.map((r, j) => (
                  <Pressable
                    key={r.id}
                    style={({ pressed }) => [
                      s.resultRow,
                      j === m.results!.length - 1 && s.infoRowLast,
                      pressed && s.rowPressed,
                    ]}
                    onPress={() => onOpenRestaurant(r)}
                  >
                    <View style={s.grow}>
                      <Text style={s.resultName} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={s.rowMeta} numberOfLines={1}>
                        {[r.cuisine, priceLabel(r.priceLevel), r.halal === true ? t('halal') : '']
                          .filter(Boolean)
                          .join('  ·  ')}
                      </Text>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={s.chatInputRow}>
        <TextInput
          style={[s.input, s.grow]}
          placeholder={t('chatPlaceholder')}
          placeholderTextColor={color.ink3}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable
          style={({ pressed }) => [s.sendBtn, pressed && s.btnPrimaryPressed]}
          onPress={send}
        >
          <Text style={s.btnPrimaryText}>{t('chatSend')}</Text>
        </Pressable>
      </View>

      <StatusBar style="dark" />
    </View>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

function ProfileScreen({
  user,
  favCount,
  reviewCount,
  bookings,
  onUpdateName,
  onLogout,
  t,
  lang,
  onSetLang,
}: {
  user: Account;
  favCount: number;
  reviewCount: number;
  bookings: Booking[];
  onUpdateName: (name: string) => void;
  onLogout: () => void;
  t: (k: string) => string;
  lang: Lang;
  onSetLang: (l: Lang) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.name);

  function save() {
    if (draftName.trim() === '') return;
    onUpdateName(draftName.trim());
    setEditing(false);
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.wordmark}>{t('myAccount')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {/* Identity */}
        <View style={s.identityRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.grow}>
            {editing ? (
              <TextInput
                style={s.input}
                value={draftName}
                onChangeText={setDraftName}
                placeholder={t('yourName')}
                placeholderTextColor={color.ink3}
                autoFocus
              />
            ) : (
              <Text style={s.profileName} numberOfLines={1}>
                {user.name}
              </Text>
            )}
            <Text style={s.rowMeta} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </View>

        {editing ? (
          <View style={s.btnRow}>
            <SecondaryButton
              grow
              label={t('cancel')}
              onPress={() => {
                setDraftName(user.name);
                setEditing(false);
              }}
            />
            <View style={s.grow}>
              <PrimaryButton label={t('saveName')} onPress={save} />
            </View>
          </View>
        ) : (
          <SecondaryButton
            label={t('editName')}
            onPress={() => {
              setDraftName(user.name);
              setEditing(true);
            }}
          />
        )}

        {/* Activity */}
        <Text style={[s.sectionTitle, s.sectionGap]}>{t('myActivity')}</Text>
        <View style={s.statRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{favCount}</Text>
            <Text style={s.statLabel}>{t('favourites')}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{reviewCount}</Text>
            <Text style={s.statLabel}>{t('reviews')}</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={[s.sectionTitle, s.sectionGap]}>{t('account')}</Text>
        <View style={s.infoTable}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>{t('status')}</Text>
            <Text style={s.infoValueAccent}>{t('active')}</Text>
          </View>
          <View style={[s.infoRow, s.infoRowLast]}>
            <Text style={s.infoLabel}>{t('memberSince')}</Text>
            <Text style={s.infoValue}>
              {new Date(user.joinedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Language */}
        <Text style={[s.sectionTitle, s.sectionGap]}>{t('language')}</Text>
        <Segmented
          value={lang}
          onChange={(k) => onSetLang(k as Lang)}
          options={[
            { key: 'en', label: 'English' },
            { key: 'ms', label: 'Bahasa Melayu' },
            { key: 'zh', label: '中文' },
          ]}
        />

        {/* Bookings */}
        <Text style={[s.sectionTitle, s.sectionGap]}>{t('myBookings')}</Text>
        {bookings.length === 0 ? (
          <Text style={s.hint}>{t('noBookings')}</Text>
        ) : (
          <View style={s.listBlock}>
            {bookings.map((b, i) => (
              <View
                key={b.id}
                style={[s.infoRow, i === bookings.length - 1 && s.infoRowLast]}
              >
                <Text style={s.infoLabel} numberOfLines={1}>
                  {b.restaurantName}
                </Text>
                <Text style={s.infoValue}>
                  {t(b.day)}  ·  {b.time}  ·  {b.partySize}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.sectionGap}>
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [s.logoutBtn, pressed && s.btnSecondaryPressed]}
          >
            <Text style={s.logoutText}>{t('logout')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <StatusBar style="dark" />
    </View>
  );
}

// ─── TAB BAR ──────────────────────────────────────────────────────────────────

function TabBar({
  tab,
  onSelect,
  t,
}: {
  tab: Tab;
  onSelect: (tab: Tab) => void;
  t: (k: string) => string;
}) {
  const items: { key: Tab; label: string }[] = [
    { key: 'explore', label: t('explore') },
    { key: 'saved', label: t('savedTab') },
    { key: 'chat', label: t('quickFind') },
    { key: 'profile', label: t('profileTab') },
  ];
  return (
    <View style={s.tabBar}>
      {items.map((i) => (
        <Pressable key={i.key} style={s.tabItem} onPress={() => onSelect(i.key)}>
          <Text style={[s.tabLabel, tab === i.key && s.tabLabelOn]} numberOfLines={1}>
            {i.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  // FILTERS
  const [query, setQuery] = useState('');
  const [halalOnly, setHalalOnly] = useState(false);
  const [cuisine, setCuisine] = useState('All');
  const [price, setPrice] = useState(0);
  const [diet, setDiet] = useState('All');

  // NAVIGATION
  const [tab, setTab] = useState<Tab>('explore');
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  // AUTH — Supabase Auth owns credentials and the session.
  const [user, setUser] = useState<Account | null>(null);

  // LANGUAGE — the one piece of state that stays on the device, since it is a
  // display preference rather than user data.
  const [lang, setLang] = useState<Lang>('en');
  const t = (k: string) => STRINGS[lang][k] ?? STRINGS.en[k] ?? k;

  // SERVER DATA. Favourites are a plain list of restaurant ids: the row level
  // security policy already restricts every query to the signed-in account, so
  // whatever comes back belongs to this user.
  const [myFavourites, setMyFavourites] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);   // every user's reviews
  const [bookings, setBookings] = useState<Booking[]>([]); // this user's bookings
  const [loaded, setLoaded] = useState(false);

  // Load the language preference once; it is not tied to an account.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setLang(JSON.parse(raw).lang ?? 'en');
      } catch {
        // no stored preference — English is the default
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ lang }));
  }, [lang]);

  // Turn a Supabase session into the profile the screens expect.
  async function loadProfile(session: Session | null) {
    if (!session) {
      setUser(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('name, created_at')
      .eq('id', session.user.id)
      .single();
    setUser({
      id: session.user.id,
      name: data?.name ?? 'User',
      email: session.user.email ?? '',
      joinedAt: new Date(data?.created_at ?? session.user.created_at).getTime(),
    });
  }

  // Restore an existing session on start, then follow every auth change.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      await loadProfile(data.session);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch this user's data whenever the signed-in account changes.
  useEffect(() => {
    if (!user) {
      setMyFavourites([]);
      setReviews([]);
      setBookings([]);
      return;
    }
    refreshFavourites();
    refreshReviews();
    refreshBookings();
  }, [user?.id]);

  async function refreshFavourites() {
    const { data } = await supabase.from('favourites').select('restaurant_id');
    setMyFavourites((data ?? []).map((r) => r.restaurant_id));
  }

  // Reviews are communal: every user's reviews are returned, and the author's
  // display name is attached from the profiles table.
  //
  // Names are fetched separately rather than through an embedded join. A join
  // would be one request instead of two, but it depends on the Data API having
  // the reviews-to-profiles foreign key in its schema cache, which is not
  // guaranteed immediately after the tables are created. Two plain queries
  // always work, and the profile table is small.
  async function refreshReviews() {
    const [{ data: rows }, { data: people }] = await Promise.all([
      supabase
        .from('reviews')
        .select('id, restaurant_id, user_id, rating, body, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name'),
    ]);

    const nameById = new Map((people ?? []).map((p: any) => [p.id, p.name]));
    setReviews(
      (rows ?? []).map((r: any) => ({
        id: r.id,
        restaurantId: r.restaurant_id,
        userId: r.user_id,
        author: nameById.get(r.user_id) ?? 'User',
        rating: r.rating,
        text: r.body ?? '',
        at: new Date(r.created_at).getTime(),
      }))
    );
  }

  async function refreshBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('id, restaurant_id, restaurant_name, day, slot_time, party_size, created_at')
      .order('created_at', { ascending: false });
    setBookings(
      (data ?? []).map((b: any) => ({
        id: b.id,
        restaurantId: b.restaurant_id,
        restaurantName: b.restaurant_name,
        day: b.day,
        time: b.slot_time,
        partySize: b.party_size,
        at: new Date(b.created_at).getTime(),
      }))
    );
  }

  // Update the screen first so the heart responds immediately, then write to
  // the server and reconcile if the write failed.
  async function toggleFavourite(id: string) {
    if (!user) return;
    const wasSaved = myFavourites.includes(id);
    setMyFavourites((prev) => (wasSaved ? prev.filter((x) => x !== id) : [...prev, id]));

    const { error } = wasSaved
      ? await supabase.from('favourites').delete().eq('restaurant_id', id).eq('user_id', user.id)
      : await supabase.from('favourites').insert({ restaurant_id: id, user_id: user.id });

    if (error) refreshFavourites(); // put the screen back in step with the server
  }

  // Upsert, because the unique constraint allows one review per person per
  // restaurant — posting again edits the existing review rather than failing.
  async function addReview(restaurantId: string, rating: number, text: string) {
    if (!user) return;
    await supabase
      .from('reviews')
      .upsert(
        { restaurant_id: restaurantId, user_id: user.id, rating, body: text },
        { onConflict: 'restaurant_id,user_id' }
      );
    refreshReviews();
  }

  async function addBooking(restaurant: Restaurant, day: string, time: string, partySize: number) {
    if (!user) return;
    await supabase.from('bookings').insert({
      user_id: user.id,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      day,
      slot_time: time,
      party_size: partySize,
    });
    refreshBookings();
  }

  // Supabase reports its own errors; they are clearer than anything generic we
  // could substitute (for example, that a password is too short).
  async function handleSignup(name: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }, // the trigger reads this to create the profile
    });
    if (error) return error.message;
    // If the project requires email confirmation, sign-up succeeds but returns
    // no session. Say so, rather than appearing to do nothing.
    if (!data.session) return t('errConfirmEmail');
    return null;
  }

  async function handleLogin(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  }

  async function handleUpdateName(newName: string) {
    if (!user) return;
    setUser({ ...user, name: newName });
    await supabase.from('profiles').update({ name: newName }).eq('id', user.id);
    refreshReviews(); // the author name shown on this user's reviews changes too
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  function openRestaurant(r: Restaurant) {
    setSelected(r);
  }

  // ── Gates ──
  if (!loaded) return <View style={s.screen} />;

  if (!user) {
    return <AuthScreen onLogin={handleLogin} onSignup={handleSignup} t={t} />;
  }

  if (showBooking && selected) {
    return (
      <BookingScreen
        restaurant={selected}
        t={t}
        onBack={() => setShowBooking(false)}
        onBook={(day, time, partySize) => addBooking(selected, day, time, partySize)}
      />
    );
  }

  if (selected) {
    return (
      <DetailScreen
        restaurant={selected}
        onBack={() => setSelected(null)}
        isFav={myFavourites.includes(selected.id)}
        onToggleFav={() => toggleFavourite(selected.id)}
        reviews={reviews.filter((rv) => rv.restaurantId === selected.id)}
        onAddReview={(rating, text) => addReview(selected.id, rating, text)}
        onBookTable={() => setShowBooking(true)}
        t={t}
      />
    );
  }

  // Keep only restaurants passing every active filter.
  const visible = RESTAURANTS.filter((r) => {
    if (!r.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    // Halal-only must require a confirmed yes. An unconfirmed restaurant is
    // excluded, because a user who filters on halal needs certainty, not a
    // maybe.
    if (halalOnly && r.halal !== true) return false;
    if (cuisine !== 'All' && r.cuisine !== cuisine) return false;
    if (price !== 0 && r.priceLevel !== price) return false;
    if (diet !== 'All' && !r.tags.includes(diet)) return false;
    return true;
  });

  const savedList = RESTAURANTS.filter((r) => myFavourites.includes(r.id));

  function renderRow(r: Restaurant) {
    const { avg, count } = reviewStats(reviews, r.id);
    return (
      <RestaurantRow
        key={r.id}
        restaurant={r}
        avg={avg}
        count={count}
        isFav={myFavourites.includes(r.id)}
        onPress={() => openRestaurant(r)}
        onToggleFav={() => toggleFavourite(r.id)}
        t={t}
      />
    );
  }

  return (
    <View style={s.app}>
      {tab === 'explore' && (
        <View style={s.screen}>
          <View style={s.header}>
            <Text style={s.wordmark}>MakanMana</Text>
            <Text style={s.headerSub}>{t('tagline')}</Text>
          </View>

          <View style={s.filterBar}>
            <TextInput
              style={s.input}
              placeholder={t('search')}
              placeholderTextColor={color.ink3}
              value={query}
              onChangeText={setQuery}
            />

            {/* Refinements — binary toggles in one scrolling row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipRow}
            >
              <Chip
                label={t('halalOnly')}
                active={halalOnly}
                onPress={() => setHalalOnly(!halalOnly)}
              />
              {DIET_TAGS.map((d) => (
                <Chip
                  key={d}
                  label={t(d.toLowerCase())}
                  active={diet === d}
                  onPress={() => setDiet(diet === d ? 'All' : d)}
                />
              ))}
            </ScrollView>

            {/* Cuisine — single-select category row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipRow}
            >
              {CUISINES.map((c) => (
                <Chip
                  key={c}
                  label={c === 'All' ? t('all') : c}
                  active={cuisine === c}
                  onPress={() => setCuisine(c)}
                />
              ))}
            </ScrollView>

            <Segmented
              value={String(price)}
              onChange={(k) => setPrice(Number(k))}
              options={PRICE_OPTIONS.map((p) => ({
                key: String(p),
                label: p === 0 ? t('anyPrice') : priceLabel(p),
              }))}
            />
          </View>

          <ScrollView contentContainerStyle={s.listPad}>
            <Text style={s.count}>
              {visible.length} {visible.length === 1 ? t('place') : t('places')}
            </Text>

            {visible.map(renderRow)}

            {visible.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyText}>{t('noMatch')}</Text>
                <SecondaryButton
                  label={t('clearFilters')}
                  onPress={() => {
                    setQuery('');
                    setHalalOnly(false);
                    setCuisine('All');
                    setPrice(0);
                    setDiet('All');
                  }}
                />
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {tab === 'saved' && (
        <View style={s.screen}>
          <View style={s.header}>
            <Text style={s.wordmark}>{t('savedTab')}</Text>
            <Text style={s.headerSub}>
              {savedList.length} {savedList.length === 1 ? t('place') : t('places')}
            </Text>
          </View>
          <ScrollView contentContainerStyle={s.listPad}>
            {savedList.length === 0 ? (
              <Text style={s.hint}>{t('noSaved')}</Text>
            ) : (
              savedList.map(renderRow)
            )}
          </ScrollView>
        </View>
      )}

      {tab === 'chat' && <ChatScreen t={t} onOpenRestaurant={openRestaurant} />}

      {tab === 'profile' && (
        <ProfileScreen
          user={user}
          favCount={myFavourites.length}
          reviewCount={reviews.filter((rv) => rv.userId === user.id).length}
          bookings={bookings}
          onUpdateName={handleUpdateName}
          onLogout={() => {
            setTab('explore');
            handleLogout();
          }}
          t={t}
          lang={lang}
          onSetLang={setLang}
        />
      )}

      <TabBar tab={tab} onSelect={setTab} t={t} />
      <StatusBar style="dark" />
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: color.paper },
  screen: { flex: 1, backgroundColor: color.paper },
  grow: { flex: 1 },

  // Headers
  header: {
    paddingTop: 56,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
  },
  subHeader: {
    paddingTop: 52,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  wordmark: {
    fontFamily,
    fontSize: size.display,
    fontWeight: weight.bold,
    letterSpacing: -0.6,
    color: color.ink,
  },
  screenTitle: {
    fontFamily,
    fontSize: size.title,
    fontWeight: weight.bold,
    letterSpacing: -0.4,
    color: color.ink,
  },
  headerSub: {
    fontFamily,
    fontSize: size.meta,
    color: color.ink2,
    marginTop: space.xs,
  },
  backLink: {
    fontFamily,
    fontSize: size.meta,
    fontWeight: weight.semibold,
    color: color.accent,
    marginBottom: space.md,
  },
  sectionTitle: {
    fontFamily,
    fontSize: size.section,
    fontWeight: weight.semibold,
    letterSpacing: -0.1,
    color: color.ink,
    marginBottom: space.md,
  },
  sectionGap: { marginTop: space.xl },

  // Filter bar
  filterBar: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  chipRow: { gap: space.sm, paddingVertical: space.sm },

  // Chips — selection is ink
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.rule,
    backgroundColor: color.paper,
  },
  chipPressed: { backgroundColor: color.paper2 },
  chipActive: { backgroundColor: color.ink, borderColor: color.ink },
  chipText: {
    fontFamily,
    fontSize: size.meta,
    fontWeight: weight.medium,
    color: color.ink2,
  },
  chipTextActive: { color: color.paper, fontWeight: weight.semibold },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },

  // Segmented control
  segTrack: {
    flexDirection: 'row',
    backgroundColor: color.paper2,
    borderRadius: radius.sm,
    padding: 3,
    gap: 3,
  },
  segItem: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segItemOn: { backgroundColor: color.paper, borderColor: color.ruleStrong },
  segText: {
    fontFamily,
    fontSize: 12,
    fontWeight: weight.medium,
    color: color.ink2,
  },
  segTextOn: { color: color.ink, fontWeight: weight.semibold },

  // Buttons
  btnPrimary: {
    backgroundColor: color.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryPressed: { backgroundColor: color.accentPressed },
  btnPrimaryText: {
    fontFamily,
    fontSize: size.body,
    fontWeight: weight.semibold,
    color: color.accentInk,
  },
  btnSecondary: {
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.ruleStrong,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  btnSecondaryPressed: { backgroundColor: color.paper2 },
  btnSecondaryText: {
    fontFamily,
    fontSize: size.body,
    fontWeight: weight.semibold,
    color: color.ink,
  },
  btnRow: { flexDirection: 'row', gap: space.md, marginTop: space.md },

  // Fields
  field: { marginBottom: space.lg },
  fieldLabel: {
    fontFamily,
    fontSize: size.meta,
    fontWeight: weight.semibold,
    color: color.ink2,
    marginBottom: space.sm,
  },
  input: {
    fontFamily,
    backgroundColor: color.paper2,
    borderWidth: 1,
    borderColor: color.rule,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    fontSize: size.body,
    color: color.ink,
  },
  textarea: { minHeight: 76, textAlignVertical: 'top', marginTop: space.md },
  error: {
    fontFamily,
    fontSize: size.meta,
    color: color.danger,
    marginBottom: space.md,
  },

  // Auth
  authWrap: { paddingHorizontal: space.lg, paddingTop: 88, paddingBottom: space.xxl },
  authTitle: {
    fontFamily,
    fontSize: size.title,
    fontWeight: weight.bold,
    letterSpacing: -0.4,
    color: color.ink,
    marginTop: space.xxl,
    marginBottom: space.lg,
  },
  authSwitch: {
    fontFamily,
    fontSize: size.meta,
    fontWeight: weight.semibold,
    color: color.accent,
    textAlign: 'center',
    marginTop: space.lg,
  },

  // Lists
  listPad: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  count: {
    fontFamily,
    fontSize: size.meta,
    color: color.ink3,
    paddingVertical: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  rowMain: { flex: 1, paddingVertical: space.lg, paddingRight: space.sm },
  rowPressed: { backgroundColor: color.paper2 },
  rowTitle: {
    fontFamily,
    fontSize: size.rowTitle,
    fontWeight: weight.semibold,
    letterSpacing: -0.2,
    color: color.ink,
  },
  rowMeta: {
    fontFamily,
    fontSize: size.meta,
    color: color.ink2,
    marginTop: 3,
  },
  rowRating: { fontWeight: weight.semibold, color: color.ink },
  star: { color: color.star },
  heartHit: { paddingTop: space.lg, paddingLeft: space.sm },
  heart: { fontSize: 20, color: color.ink3 },
  heartOn: { color: color.accent },

  // Badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  badgeHalal: {
    fontFamily,
    fontSize: size.micro,
    fontWeight: weight.semibold,
    letterSpacing: 0.2,
    color: color.accentPressed,
    backgroundColor: color.accentTint,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  badgeUnknown: {
    fontFamily,
    fontSize: size.micro,
    fontWeight: weight.semibold,
    letterSpacing: 0.2,
    color: '#8a6d1f',
    backgroundColor: '#f7efd9',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  infoValueMuted: {
    fontFamily,
    fontSize: size.meta,
    fontStyle: 'italic',
    color: color.ink3,
  },
  badgeNeutral: {
    fontFamily,
    fontSize: size.micro,
    fontWeight: weight.semibold,
    letterSpacing: 0.2,
    color: color.ink2,
    backgroundColor: color.paper2,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },

  // Empty states
  empty: { paddingTop: space.xxl, gap: space.lg },
  emptyText: {
    fontFamily,
    fontSize: size.body,
    color: color.ink2,
    textAlign: 'center',
  },
  hint: { fontFamily, fontSize: size.meta, color: color.ink3, lineHeight: 20 },

  // Detail
  body: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xxxl },
  ratingBlock: { marginBottom: space.lg },
  ratingBig: {
    fontFamily,
    fontSize: 22,
    fontWeight: weight.bold,
    letterSpacing: -0.4,
    color: color.ink,
  },
  ratingBigSub: {
    fontFamily,
    fontSize: size.meta,
    fontWeight: weight.regular,
    color: color.ink2,
  },
  ratingNone: { fontFamily, fontSize: size.body, color: color.ink2 },

  card: {
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.rule,
    borderRadius: radius.md,
    padding: space.lg,
  },
  listBlock: {
    borderWidth: 1,
    borderColor: color.rule,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  infoTable: {
    borderWidth: 1,
    borderColor: color.rule,
    borderRadius: radius.md,
    marginTop: space.lg,
    marginBottom: space.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontFamily, fontSize: size.meta, color: color.ink2, flexShrink: 1 },
  infoValue: {
    fontFamily,
    fontSize: size.meta,
    fontWeight: weight.medium,
    color: color.ink,
  },
  infoValueAccent: {
    fontFamily,
    fontSize: size.meta,
    fontWeight: weight.semibold,
    color: color.accent,
  },
  infoValueWrap: { flex: 1, textAlign: 'right', marginLeft: space.lg },

  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  menuName: { fontFamily, fontSize: size.body, color: color.ink, flexShrink: 1 },
  menuPrice: {
    fontFamily,
    fontSize: size.body,
    fontWeight: weight.semibold,
    color: color.ink,
  },

  // Review form + list
  starPickRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  starPick: { fontSize: 28, color: color.ink3 },
  starPickOn: { color: color.star },
  reviewRow: {
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    fontFamily,
    fontSize: size.body,
    fontWeight: weight.semibold,
    color: color.ink,
  },
  reviewStars: { fontFamily, fontSize: size.meta, color: color.star },
  reviewText: {
    fontFamily,
    fontSize: size.body,
    color: color.ink2,
    lineHeight: 21,
    marginTop: space.sm,
  },
  reviewDate: { fontFamily, fontSize: size.micro, color: color.ink3, marginTop: space.sm },

  // Booking
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.ruleStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontFamily, fontSize: 20, fontWeight: weight.medium, color: color.ink },
  stepValue: {
    fontFamily,
    fontSize: size.body,
    fontWeight: weight.semibold,
    color: color.ink,
    minWidth: 96,
    textAlign: 'center',
  },
  tickWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  tick: { fontFamily, fontSize: 22, fontWeight: weight.bold, color: color.accent },
  confirmTitle: {
    fontFamily,
    fontSize: size.title,
    fontWeight: weight.bold,
    letterSpacing: -0.4,
    color: color.ink,
  },

  // Chat
  chatBody: { padding: space.lg, gap: space.md, flexGrow: 1 },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: color.accent,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    maxWidth: '82%',
  },
  bubbleUserText: { fontFamily, fontSize: size.body, color: color.accentInk, lineHeight: 20 },
  bubbleBot: {
    alignSelf: 'flex-start',
    backgroundColor: color.paper2,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    maxWidth: '88%',
  },
  bubbleBotText: { fontFamily, fontSize: size.body, color: color.ink, lineHeight: 20 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  resultName: {
    fontFamily,
    fontSize: size.body,
    fontWeight: weight.semibold,
    color: color.ink,
  },
  chevron: { fontFamily, fontSize: 22, color: color.ink3, paddingLeft: space.sm },
  chatInputRow: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  sendBtn: {
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },

  // Profile
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily,
    fontSize: 20,
    fontWeight: weight.semibold,
    color: color.ink,
  },
  profileName: {
    fontFamily,
    fontSize: size.title,
    fontWeight: weight.bold,
    letterSpacing: -0.4,
    color: color.ink,
  },
  statRow: { flexDirection: 'row', gap: space.md },
  statBox: {
    flex: 1,
    backgroundColor: color.paper2,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  statNum: {
    fontFamily,
    fontSize: 26,
    fontWeight: weight.bold,
    letterSpacing: -0.5,
    color: color.ink,
  },
  statLabel: { fontFamily, fontSize: size.meta, color: color.ink2, marginTop: 2 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: color.ruleStrong,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  logoutText: {
    fontFamily,
    fontSize: size.body,
    fontWeight: weight.semibold,
    color: color.danger,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: color.rule,
    backgroundColor: color.paper,
    paddingTop: space.md,
    paddingBottom: space.xl,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: space.xs },
  tabLabel: {
    fontFamily,
    fontSize: size.meta,
    fontWeight: weight.medium,
    color: color.ink3,
  },
  tabLabelOn: { color: color.accent, fontWeight: weight.bold },
});
