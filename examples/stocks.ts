import {Table, stats} from "../index"

function createSequence(time: number, expret: number, stddev: number): number[] {
	let price = [1]
	for (let i = 1; i < time; i++) {
		price.push(price[i-1] * gaussianRandom(expret, stddev))
	}
	return price
}

const YEARS = 10
const RUNS = 500
const PERIODS_PER_YEAR = 12

const ANNUAL_RETURN = 1.1072
const ANNUAL_STDDEV = 0.1529

const RET = Math.pow(ANNUAL_RETURN, 1/PERIODS_PER_YEAR)
const STDDEV = ANNUAL_STDDEV/Math.sqrt(PERIODS_PER_YEAR)
const TIME = PERIODS_PER_YEAR*YEARS

let time = Array(TIME).fill(0).map((_, i) => i/PERIODS_PER_YEAR)
let table = Table.fromArray(time, "time")

for (let i = 0; i < RUNS; i++) {
	if (i % Math.floor(RUNS/10) == 0) console.log(`${Math.round(i/RUNS*100)}%`)
	table = table.addColumn(`price ${i+1}`, createSequence(TIME, RET, STDDEV))
}

let lastTime = structuredClone(table.row(TIME-1)) as any
delete lastTime["time"]

let returns = Object.values(lastTime) as number[]

let [min, q1, q2, q3, max] = stats.quartiles(returns)
let [avg, stddev] = stats.avgAndStddev(returns)
let stddevPerc= (stddev/avg*100).toFixed(2) + "%"

let table2 = table.addComputedColumn("q1", () => q1)
let table3 = table2.addComputedColumn("med", () => q2)
let table4 = table3.addComputedColumn("q3", () => q3)
let table5 = table4.addComputedColumn("avg", () => avg)

table5.plot("time", [...Array(10).fill(0).map((_, i) => `price ${i+1}`, ) as any, "q1", "med", "q3", "avg"])

console.table({min, q1, q2, q3, max, avg, stddevPerc})
console.log(`runs with loss: ${returns.filter(x => x < 1).length / returns.length * 100}%`)

function gaussianRandom(mean: number, stdev: number): number {
    const u = 1 - Math.random()
    const v = Math.random()
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2*Math.PI*v)
    return z * stdev + mean
}
