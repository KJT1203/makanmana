# McDonald's Taman Connaught — verified menu

Transcribed from screenshots of the **McDonald's Malaysia app** (Order tab),
captured 15 August 2026. These replace the placeholder menu that `App.tsx`
carried for restaurant `id: '1'`.

> **Caveat before the demo:** these came from the in-app ordering flow, which in
> Malaysia can price slightly above the counter menu. Treat them as verified
> *app* prices. Anything not listed here is still unverified — the old
> placeholder entries (McChicken, Fries, McFlurry) were dropped because no
> screenshot covered them.

`App.tsx` stores only the à la carte price, since `MenuItem` is `{ name, price }`.
Meal prices are kept below so nothing is lost if the type grows a `mealPrice`
field later.

## Burgers

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
| Ayam Combo E: 1pc Ayam Goreng McD + 6pcs Chicken McNuggets | 15.94 | — |

## Still unverified

The other four restaurants (`id` 2–5) ship with empty `menu` arrays, and their
cuisine, price level, hours, tags and ratings remain the placeholder values
flagged in `App.tsx`. Only McDonald's has been checked against a real source.
