import util from "util"
import { Console } from "node:console"
import { Transform } from "node:stream"
import {plot, type Plot, type Layout, type Config} from "nodeplotlib"

const ts = new Transform({ transform(chunk, _enc, cb) { cb(null, chunk) } })
const logger = new Console({ stdout: ts })

function tableToString(data: any): string {
	logger.table(data)
	return (ts.read() || "").toString()
}


export class Table<T extends Record<string, any>> {
	rows: T[]
	constructor(rows: T[]) {
		this.rows = rows
	}

	static fromArray<U, S extends string>(array: U[], rowName: S): Table<{[key in S]:U}> {
		let rows = array.map(value => ({[rowName]: value}))
		// @ts-ignore
		return new Table(rows)
	}

	addComputedRow<U, S extends string>(rowName: S, fn: (row: T) => U): Table<T & { [key in S]: U }> {
		let newRows = structuredClone(this.rows)
		newRows = newRows.map((row) => {
			return {...row, [rowName]: fn(row)}
		})
		return new Table(newRows)
	}

	addRow<U, S extends string>(rowName: S, rowValues: U[]): Table<T & { [key in S]: U }> {
		if (rowValues.length !== this.rows.length) {
			throw new Error("Row length mismatch")
		}
		let newRows = structuredClone(this.rows)
		newRows = newRows.map((row, i) => {
			return {...row, [rowName]: rowValues[i]}
		})
		return new Table(newRows)
	}

	columns(): {[key in keyof T]: T[key][]} {
		let keys = Object.keys(this.rows[0])
		let values = keys.map(key => this.rows.map(row => row[key]))

		// @ts-ignore
		return Object.fromEntries(keys.map((key, i) => [key, values[i]]))
	}

	toString(): string {
		return tableToString(this.rows)
	}

	[util.inspect.custom](): string {
		return tableToString(this.rows)
	}

	plot(x: keyof T, y?: (keyof T)[]) {
		if (y === undefined) {
			y = Object.keys(this.rows[0]).filter(k => k !== x)
		}
		let columns = this.columns()
		let xValues = columns[x]
		let yPairs = y.map(k => [k, columns[k]])

		// @ts-ignore
		let plots: Plot[] = yPairs.map(([yName, yValues]) => {
			return {x: xValues, y: yValues, name: yName}
		})

		// @ts-ignore
		let layout: Layout = {title: this.constructor.name, xaxis: {title: x}, yaxis: {title: y.join(", ")}}
		let config: Config = {}

		plot(plots, layout, config)
	}
}
