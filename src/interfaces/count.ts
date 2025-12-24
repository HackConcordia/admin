export interface Count {
  status: status;
  shirtSize: shirtSize;
  dietaryRestrictions: dietaryRestrictions;
}
interface status {
  total: number;
  verified: number;
  unverified: number;
  submitted: number;
  admitted: number;
  waitlisted: number;
  confirmed: number;
  declined: number;
  checkedIn: number;
}
interface shirtSize {
  smallShirt: number;
  mediumShirt: number;
  largeShirt: number;
  xlargeShirt: number;
}

interface dietaryRestrictions {
  vegetarian: number;
  vegan: number;
  glutenFree: number;
  halal: number;
  kosher: number;
  nutAllergy: number;
  dairyFree: number;
  other: number;
}
