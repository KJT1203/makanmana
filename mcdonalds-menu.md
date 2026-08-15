# McDonald's Taman Connaught — verified menu

Transcribed from screenshots of the **McDonald's Malaysia app** (Order tab),
captured 15 August 2026. These replace the placeholder menu that `App.tsx`
carried for restaurant `id: '1'`.

> **Caveat before the demo:** these came from the in-app ordering flow, which in
> Malaysia can price slightly above the counter menu. Treat them as verified
> *app* prices.

## How this maps into the app

`MenuItem` is `{ name, price }`, so `App.tsx` stores the à la carte price only.
Two things are recorded here but deliberately not in the app:

1. **Meal prices** — kept in the tables below until `MenuItem` grows a
   `mealPrice` field.
2. **Spicy / Regular / Mixed variants** — McDonald's prices these identically
   (all three `3pcs Ayam Tenders McD` are RM 11.32). The app collapses them to
   one row, since three rows at the same price help nobody choose where to eat.
   Every variant is still listed here.

Items marked ⚠️ were flagged **Currently unavailable** in the app at capture
time and are omitted from `App.tsx` rather than shown as orderable.

## Beef

| Item | À la carte | Meal |
| --- | ---: | ---: |
| Beef Burger | 7.69 | — |
| Spicy Beef Burger | 7.83 | 9.39 |
| Cheeseburger | 8.63 | 10.94 |
| Spicy Beef Burger with Egg | 8.77 | 10.33 |
| Double Cheeseburger | 11.42 | 15.05 |
| Spicy Double Cheese | 12.31 | 15.66 |
| Big Mac | 13.73 | 17.45 |
| Creamy Mushroom Double Beef Burger | 13.77 | 15.99 |
| Quarter Pounder with Cheese | 14.15 | 17.88 |
| Triple Cheeseburger | 16.13 | 19.76 |
| Spicy Triple Cheese | 17.03 | 20.38 |
| Double Quarter Pounder with Cheese | 18.87 | 22.59 |

## Chicken burgers

| Item | À la carte | Meal |
| --- | ---: | ---: |
| Chicken Burger | 7.12 | 8.44 |
| McChicken | 7.36 | 11.27 |
| Double Spicy Chicken with Cheese | 8.82 | 10.33 |
| Creamy Mushroom Chicken Burger | 8.96 | 10.33 |
| Double Chicken Burger | 10.90 | 14.58 |
| Double McChicken | 12.08 | 15.99 |
| GCB | 13.77 | 16.60 |
| Creamy Mushroom Double Chicken Burger | 13.77 | 15.05 |
| Spicy Chicken McDeluxe | 13.87 | 16.84 |
| ⚠️ Regular Chicken McDeluxe (Non-Spicy) | 13.87 | 16.84 |
| Double Spicy Chicken McDeluxe | 22.45 | 25.42 |
| ⚠️ Double Regular Chicken McDeluxe (Non-Spicy) | 22.45 | 25.42 |
| Double GCB | 22.59 | 25.42 |

## Fish

| Item | À la carte | Meal |
| --- | ---: | ---: |
| Filet-O-Fish | 9.43 | 12.83 |
| Double Filet-O-Fish | 14.48 | 17.88 |

## McNuggets

| Item | À la carte | Meal |
| --- | ---: | ---: |
| 6pcs Chicken McNuggets | 9.43 | 12.17 |
| 9pcs Chicken McNuggets | 13.49 | 16.23 |
| 20pcs Chicken McNuggets | 25.57 | — |

## Ayam Goreng McD

Spicy, Regular and Mixed are the same price throughout.

| Item | Variants | À la carte | Meal |
| --- | --- | ---: | ---: |
| 1pc Ayam Goreng McD McValue Meal | Spicy, Regular | 9.39 | — |
| 2pcs Ayam Goreng McD | Spicy, Regular, Mixed | 13.82 | 16.98 |
| 2pcs Ayam Goreng McD with Creamy Mushroom Sauce | Spicy, Regular, Mixed | 15.24 | 18.68 |
| 3pcs Ayam Goreng McD | Spicy, Regular, Mixed | 17.92 | 21.70 |
| 3pcs Ayam Goreng McD with Creamy Mushroom Sauce | Spicy, Regular, Mixed | 19.53 | 22.64 |
| 5pcs Ayam Goreng McD | Spicy, Regular, Mixed | 30.85 | — |
| 10pcs Ayam Goreng McD | Spicy, Regular, Mixed | 57.36 | — |

## Ayam Tenders McD

| Item | Variants | À la carte | Meal |
| --- | --- | ---: | ---: |
| 3pcs Ayam Tenders McD | Spicy, Regular, Mixed | 11.32 | 15.05 |
| 5pcs Ayam Tenders McD | Spicy, Regular, Mixed | 16.51 | 19.81 |

## Combos

Full names as they appear in the app; `App.tsx` uses shortened labels so the
price does not wrap on a phone.

| Item | Price |
| --- | ---: |
| Ayam Combo C: 1pc Ayam Goreng McD + Coleslaw/Whipped Potato | 9.34 |
| Ayam Combo D: 1pc Ayam Goreng McD + Nasi + Coleslaw/Whipped | 10.28 |
| Ayam Combo E: 1pc Ayam Goreng McD + 6pcs Chicken McNuggets | 15.94 |
| Ayam Combo A: 2pcs Ayam Goreng McD + Coleslaw/Whipped Potato | 16.98 |
| Ayam Combo F: 1pc Ayam Goreng McD + Spicy Chicken McDeluxe + … | 17.83 |
| Ayam Combo B: 3pcs Ayam Goreng McD + Coleslaw/Whipped Potato | 21.70 |
| Family Combo A | 37.64 |
| Family Combo B | 47.08 |

The Ayam Combo F name is truncated in the app's own UI, so the third component
is unknown.

## Still missing

Not covered by any screenshot, so still absent from the app: **fries, drinks,
desserts (McFlurry, sundae, pie), breakfast, and sides** beyond what appears in
the combos. The original placeholder entries for McChicken, Fries and McFlurry
were dropped — McChicken has since been verified at RM 7.36, the other two have
not.

## Other restaurants

Restaurants `id` 2–5 still ship with empty `menu` arrays, and their cuisine,
price level, hours, tags and ratings remain the placeholder values flagged in
`App.tsx`. Only McDonald's has been checked against a real source.
