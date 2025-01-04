import {Table, utils} from "../index"

let table = Table.fromArray(utils.arrayFilledWith(i => i, 1000), "x")
	.addComputedColumn("sin(x)", (row) => Math.sin(row.x/100*Math.PI)*1000)
	.addComputedColumn("cos(x)", (row) => Math.cos(row.x/100*Math.PI)*1000)
	.addComputedColumn("id(x)", (row) => row.x)

table.plot("x")

let csvTable = await Table.fromCSV("test.csv")
console.log(csvTable)
csvTable.bar("date", ["This", "test"])

let table2 = Table.fromArray(Array(10).fill(0).map((_, i) => i), "x")
let table3 = table2.addComputedColumn("sin(x)", (row) => Math.sin(row.x/2*Math.PI)*10)

table3.plot("x")
