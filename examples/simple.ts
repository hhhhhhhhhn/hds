import {Table} from "../index"

let table = Table.fromArray(Array(1000).fill(0).map((_, i) => i), "x")
let newTable = table.addComputedColumn("sin(x)", (row) => Math.sin(row.x/100*Math.PI)*1000)
let newTable2 = newTable.addComputedColumn("cos(x)", (row) => Math.cos(row.x/100*Math.PI)*1000)
let newTable3 = newTable2.addComputedColumn("id(x)", (row) => row.x)

newTable3.plot("x")

let csvTable = await Table.fromCSV("test.csv")
console.log(csvTable)
csvTable.bar("date", ["This", "test"])

table = Table.fromArray(Array(10).fill(0).map((_, i) => i), "x")
let table2 = table.addComputedColumn("sin(x)", (row) => Math.sin(row.x/2*Math.PI)*10)

table2.plot("x")
