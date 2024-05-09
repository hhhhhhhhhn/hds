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

	static fromColumns<T extends Record<string, any>>(columns: {[key in keyof T]: T[key][]}): Table<T> {
		let headers = Object.keys(columns)
		let rows: T[] = []
		for (let i = 0; i < columns[0].length; i++) {
			let row: any = {}
			for (let header of headers) {
				row[header] = columns[header][i]
			}
			rows.push(row)
		}
		return new Table(rows)
	}

	static async fromCSV(filename: string): Promise<Table<Record<string, any>>> {
		let content = await Bun.file(filename).text()
		return Table.fromCSVString(content)
	}

	static fromCSVString(content: string): Table<Record<string, any>> {
		let lines = content.split("\n")
		let headers = lines[0].split(",")
		let valueRows = lines.slice(1).map(row => row.split(",")).filter(row => row.length == headers.length)

		let rows: Record<string, any>[] = []
		for (let valueRow of valueRows) {
			let row: any = {}
			if (valueRow.length !== headers.length) {
				continue
			}
			for (let i = 0; i < headers.length; i++) {
				row[headers[i]] = valueRow[i]
			}
			rows.push(row)
		}
		console.log(rows)
		// @ts-ignore
		return new Table(rows)
	}

	addComputedColumn<U, S extends string>(columnName: S, fn: (row: T) => U): Table<T & { [key in S]: U }> {
		let newRows = structuredClone(this.rows)
		newRows = newRows.map((row) => {
			return {...row, [columnName]: fn(row)}
		})
		return new Table(newRows)
	}

	addColumn<U, S extends string>(columnName: S, columnValues: U[]): Table<T & { [key in S]: U }> {
		if (columnValues.length !== this.rows.length) {
			throw new Error("Row length mismatch")
		}
		let newRows = structuredClone(this.rows)
		newRows = newRows.map((row, i) => {
			return {...row, [columnName]: columnValues[i]}
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
