import {Table} from "../index"

let table = Table.fromArray(Array(1000).fill(0).map((_, i) => i), "x")
let newTable = table.addComputedColumn("y", (row) => Math.sin(row.x/20))
console.log(newTable)

let csvTable = await Table.fromCSV("test.csv")
console.log(csvTable)
