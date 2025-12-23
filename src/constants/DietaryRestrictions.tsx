import { Language } from "@/lib/LanguageContext";

export const DietaryRestrictions = (lang: Language = "en") => [
  { value: "none", label: lang === "en" ? "None" : "Aucune" },
  { value: "vegetarian", label: lang === "en" ? "Vegetarian" : "Végétarien" },
  { value: "vegan", label: lang === "en" ? "Vegan" : "Végétalien" },
  { value: "glutenFree", label: lang === "en" ? "Gluten-Free" : "Sans gluten" },
  { value: "halal", label: lang === "en" ? "Halal" : "Halal" },
  { value: "kosher", label: lang === "en" ? "Kosher" : "Casher" },
  {
    value: "nutAllergy",
    label: lang === "en" ? "Nut Allergy" : "Allergie aux noix",
  },
  {
    value: "dairyFree",
    label: lang === "en" ? "Dairy-Free" : "Sans produits laitiers",
  },
  { value: "other", label: lang === "en" ? "Other" : "Autre" },
];
