# Archived data from the removed sales and distribution modules

Nine screens — Plant Sales, Store Sales, Collection Center, Milk Distribution,
CC Distribution, Store Receipts, Slip Verification, Dahi Production and
Distribution Reports — were removed, and the ten tables behind them dropped.

Seven of those tables were empty. These CSVs are everything the other three
held: 32 rows in total, none written in months.

| File | Table | Rows |
|---|---|---|
| `slip_verification.csv` | `slip_verification` | 29 |
| `milk_distributions.csv` | `milk_distributions` | 2 |
| `collection_center_distributions.csv` | `collection_center_distributions` | 1 |

`farmer_id` has been resolved to farmer code and name, so these stay readable
after the id is meaningless.

Empty at the time of removal, so nothing to archive: `plant_sales`,
`store_sales`, `collection_center_sales`, `store_receipts`, `dahi_production`,
`cream_stock`, `ffm_stock`.
