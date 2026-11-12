import type { Customer, Settings, Supplier, User } from "../types";

export const seedUsers: User[] = [
  { id: "u-owner", name: "Thomas Kurian", username: "owner", role: "owner", active: true },
  { id: "u-manager", name: "Anoop Menon", username: "manager", role: "manager", active: true },
  { id: "u-cashier", name: "Shahana Basheer", username: "cashier", role: "cashier", active: true },
  { id: "u-production", name: "Rajan P.", username: "production", role: "production", active: true },
  { id: "u-cashier2", name: "Jithin Varghese", username: "jithin", role: "cashier", active: true },
];

export const seedCustomers: Customer[] = [
  { id: "c-01", name: "Hotel Malabar Palace", type: "hotel", phone: "94470 21456", place: "Kozhikode", priceType: "wholesale", creditLimit: 150000, openingBalance: 18500 },
  { id: "c-02", name: "Paragon Restaurant", type: "restaurant", phone: "94951 33872", place: "Kozhikode", priceType: "wholesale", creditLimit: 200000, openingBalance: 0 },
  { id: "c-03", name: "Zamzam Family Restaurant", type: "restaurant", phone: "98460 77120", place: "Kunnamangalam", priceType: "wholesale", creditLimit: 100000, openingBalance: 7200 },
  { id: "c-04", name: "Hotel Sagar", type: "hotel", phone: "94472 60918", place: "Mavoor Road", priceType: "wholesale", creditLimit: 120000, openingBalance: 0 },
  { id: "c-05", name: "Thalassery Biriyani House", type: "restaurant", phone: "97450 18833", place: "Feroke", priceType: "wholesale", creditLimit: 80000, openingBalance: 0 },
  { id: "c-06", name: "Al Baik Shawarma Point", type: "restaurant", phone: "99470 45561", place: "Medical College", priceType: "wholesale", creditLimit: 60000, openingBalance: 3400 },
  { id: "c-07", name: "Ruchi Caterers", type: "caterer", phone: "94460 92217", place: "Ramanattukara", priceType: "wholesale", creditLimit: 150000, openingBalance: 0 },
  { id: "c-08", name: "Sadhya Catering Service", type: "caterer", phone: "98950 31476", place: "Balussery", priceType: "wholesale", creditLimit: 100000, openingBalance: 12000 },
  { id: "c-09", name: "Hotel Ambika", type: "hotel", phone: "94973 50024", place: "Koyilandy", priceType: "wholesale", creditLimit: 75000, openingBalance: 0 },
  { id: "c-10", name: "KR Bakes & Restaurant", type: "restaurant", phone: "95390 66482", place: "Mukkam", priceType: "wholesale", creditLimit: 60000, openingBalance: 0 },
  { id: "c-11", name: "Nila Events & Catering", type: "caterer", phone: "90740 12895", place: "Vadakara", priceType: "wholesale", creditLimit: 120000, openingBalance: 0 },
  { id: "c-12", name: "Suresh Kumar", type: "retail", phone: "98471 20364", place: "Kunnamangalam", priceType: "retail", creditLimit: 5000, openingBalance: 0 },
  { id: "c-13", name: "Fathima Rasheed", type: "retail", phone: "97461 88205", place: "Chevayur", priceType: "retail", creditLimit: 5000, openingBalance: 0 },
  { id: "c-14", name: "Biju Thomas", type: "retail", phone: "94476 51739", place: "Thamarassery", priceType: "retail", creditLimit: 3000, openingBalance: 450 },
  { id: "c-15", name: "Lakshmi Nair", type: "retail", phone: "99610 37248", place: "Eranhipalam", priceType: "retail", creditLimit: 3000, openingBalance: 0 },
  { id: "c-16", name: "Abdul Latheef", type: "retail", phone: "98479 04416", place: "Pantheerankavu", priceType: "retail", creditLimit: 5000, openingBalance: 0 },
];

export const seedSuppliers: Supplier[] = [
  { id: "s-01", name: "Green Valley Poultry Farm", contact: "Mathew Joseph", phone: "94470 80231", place: "Thamarassery" },
  { id: "s-02", name: "Malabar Broiler Farms", contact: "Ashraf K.", phone: "98461 44790", place: "Mukkam" },
  { id: "s-03", name: "Wayanad Hill Farms", contact: "Sibi George", phone: "94959 12068", place: "Kalpetta" },
  { id: "s-04", name: "Pollachi Suguna Agency", contact: "Senthil Kumar", phone: "98422 67153", place: "Pollachi" },
  { id: "s-05", name: "Namakkal KPN Poultry", contact: "Murugan R.", phone: "97888 30945", place: "Namakkal" },
];

export const seedSettings: Settings = {
  shop: {
    name: "TKS Chicken Centre",
    tagline: "Fresh chicken, cut to order",
    address: "Near Bus Stand, Kunnamangalam, Kozhikode, Kerala 673571",
    phone: "0495 280 1234",
    gstin: "32ABCDE1234F1Z5",
    fssai: "11321008000123",
    upiId: "tkschicken@okaxis",
    openingCash: 5000,
  },
  bill: {
    header: "",
    footer: "Thank you! Visit again.",
    showLogo: true,
    showCategoryCode: true,
    showGstin: true,
    showCustomer: true,
    paperWidth: "80mm",
  },
};
