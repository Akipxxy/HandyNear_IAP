// Shared handyman data — used by both the Browse page and the Book page.
// Previously this array was hardcoded inside browse.js, which meant there was
// nothing for the Book page to look up by id. Pulled out here so both pages
// read from the same source.
//
// baseRate is a flat estimated job cost in KES. Nothing in the app had a price
// anywhere before this — it's needed for the booking summary and for the
// "Can I afford this?" calculator on the Book page.
const handymen = [
  { id: 1, name: "John Mwangi", category: "plumbing", location: "Westlands, Nairobi", rating: 4.5, photo: "https://i.pravatar.cc/150?img=3", baseRate: 3500 },
  { id: 2, name: "Grace Wanjiru", category: "electrical", location: "Kilimani, Nairobi", rating: 4.8, photo: "https://i.pravatar.cc/150?img=5", baseRate: 4500 },
  { id: 3, name: "Peter Otieno", category: "carpentry", location: "Lavington, Nairobi", rating: 4.2, photo: "https://i.pravatar.cc/150?img=8", baseRate: 5000 },
  { id: 4, name: "Mary Achieng", category: "painting", location: "Karen, Nairobi", rating: 4.6, photo: "https://i.pravatar.cc/150?img=9", baseRate: 6000 },
  { id: 5, name: "Samuel Kiptoo", category: "general", location: "Ngong Road, Nairobi", rating: 4.0, photo: "https://i.pravatar.cc/150?img=12", baseRate: 2500 },
  { id: 6, name: "Faith Njeri", category: "plumbing", location: "South B, Nairobi", rating: 4.7, photo: "https://i.pravatar.cc/150?img=15", baseRate: 3500 },
];

export default handymen;