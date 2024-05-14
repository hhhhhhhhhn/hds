import util from "util"
import { Console } from "node:console"
import { Transform } from "node:stream"
import {plot, red, green, blue, yellow, magenta, cyan} from "asciichart"

import * as stats from "./stats"
export {stats}

const ts = new Transform({ transform(chunk, _enc, cb) { cb(null, chunk) } })
const logger = new Console({ stdout: ts })

const COLORS = Array(100).fill([blue, green, red, yellow, magenta, cyan]).flat()
const RESET = "\x1b[0m"

function tableToString(data: any): string {
	logger.table(data)
	return (ts.read() || "").toString()
}

function widthIgnoreANSI(text: string): number {
	return text.replaceAll("\x1b[", "").replaceAll(/\d+m/g, "").length
}

function padCenter(text: string, width: number): string {
	let textWidth = widthIgnoreANSI(text)
	let left = Math.floor((width - textWidth) / 2)
	let right = width - textWidth - left
	return " ".repeat(left) + text + " ".repeat(right)
}

function parseNumber(str: string): number {
	let num = Number(str)
	if (isNaN(num) && str.toLowerCase() != "nan") {
		throw false
	}
	return num
}

function parseBool(str: string): boolean {
	if (str.toLowerCase() == "true") return true
	if (str.toLowerCase() == "false") return false
	throw false
}

// TODO: Use dd/mm/yy
function parseDate(str: string): Date {
	let date = new Date(str)
	if (date.toString() == "Invalid Date") throw false
	return date
}

function parseColumnWithFunctions(column: string[], functions: ((name: string) => any)[]): any[] {
	for (let fn of functions) {
		try {return column.map(fn)}
		catch {}
	}
	return column
}

function parseCSVColumn(column: string[]): any[] {
	return parseColumnWithFunctions(column, [parseNumber, parseDate, parseBool])
}


export class Table<T extends Record<string, any>> {
	rows: T[]
	headers: (keyof T)[]

	constructor(rows: T[], headers: (keyof T)[] = Object.keys(rows[0])) {
		this.rows = rows
		this.headers = headers
	}

	static fromArray<U, S extends string>(array: U[], rowName: S): Table<{[key in S]:U}> {
		let rows = array.map(value => ({[rowName]: value}))
		// @ts-ignore
		return new Table(rows)
	}

	static fromColumns<T extends Record<string, any>>(columns: {[key in keyof T]: T[key][]}, headers: (keyof T)[] = Object.keys(columns)): Table<T> {
		let rows: T[] = []
		for (let i = 0; i < Object.values(columns)[0].length; i++) {
			let row: any = {}
			for (let header of headers) {
				row[header] = columns[header][i]
			}
			rows.push(row)
		}
		return new Table(rows, headers)
	}

	static async fromCSV(filename: string): Promise<Table<Record<string, any>>> {
		let content = await Bun.file(filename).text()
		return Table.fromCSVString(content)
	}

	static fromCSVString(content: string): Table<Record<string, any>> {
		let lines = content.split("\n")
		let headers = lines[0].split(",")
		let valueRows = lines.slice(1).map(row => row.split(",")).filter(row => row.length == headers.length)

		let valueColumns = valueRows[0].map((_, i) => valueRows.map(row => row[i]))

		let processedColumns = Object.fromEntries(valueColumns.map(parseCSVColumn).map((column, i) => [headers[i], column]))

		return Table.fromColumns(processedColumns, headers)
	}

	addComputedColumn<U, S extends string>(columnName: S, fn: (row: T) => U): Table<T & { [key in S]: U }> {
		let newRows = structuredClone(this.rows)
		newRows = newRows.map((row) => {
			return {...row, [columnName]: fn(row)}
		})
		return new Table(newRows, [...this.headers, columnName])
	}

	addColumn<U, S extends string>(columnName: S, columnValues: U[]): Table<T & { [key in S]: U }> {
		if (columnValues.length !== this.rows.length) {
			throw new Error("Row length mismatch")
		}
		let newRows = structuredClone(this.rows)
		newRows = newRows.map((row, i) => {
			return {...row, [columnName]: columnValues[i]}
		})
		return new Table(newRows, [...this.headers, columnName])
	}

	columns(): {[key in keyof T]: T[key][]} {
		let keys = Object.keys(this.rows[0])
		let values = keys.map(key => this.rows.map(row => row[key]))

		// @ts-ignore
		return Object.fromEntries(keys.map((key, i) => [key, values[i]]))
	}

	column<S extends keyof T>(name: S): T[S][] {
		return this.rows.map(row => row[name])
	}

	row(index: number): T {
		return this.rows[index]
	}

	toString(): string {
		return tableToString(this.rows)
	}

	[util.inspect.custom](): string {
		return tableToString(this.rows)
	}

	sort(fn: (a: T, b: T) => number): Table<T> {
		let rows = structuredClone(this.rows)
		rows.sort(fn)
		return new Table(rows, this.headers)
	}

	sortBy(key: keyof T): Table<T> {
		return this.sort((a, b) => a[key] - b[key])
	}

	find(fn: (row: T) => boolean): T | undefined {
		return this.rows.find(fn)
	}

	findIndex(fn: (row: T) => boolean): number {
		return this.rows.findIndex(fn)
	}

	bar(x: keyof T = this.headers[0], ys?: (keyof T)[]) {
		if (ys === undefined) {
			ys = this.headers.filter(k => k !== x)
		}

		const xVals = this.column(x)

		const width = process.stdout.columns
		const textWidth = xVals.map(k => String(k).length).reduce((a, b) => Math.max(a, b))
		const barWidth = width - textWidth - 2 // -2 for the separator

		let title = ys.map((yName, i) => COLORS[i] + String(yName) + RESET).join(", ")
		title = "Graph of " + title + " with respect to " + String(x)
		console.log(padCenter(title, width))

		let maxYVal = this.rows.map(row => ys.map(yName => row[yName] as number).reduce((a, b) => Math.max(a, b))).reduce((a, b) => Math.max(a, b))

		for (let i = 0; i < this.rows.length; i++) {
			for (let j = 0; j < ys.length; j++) {
				let line = ""
				if (j == 0) {
					line += (this.rows[i][x] as string).padStart(textWidth)
				} else {
					line += " ".repeat(textWidth)
				}
				line += " |"

				let val = Math.round(this.rows[i][ys[j]]/maxYVal * barWidth)

				line += COLORS[j] + "█".repeat(val) + RESET

				console.log(line)
			}
			if (ys.length > 1 && i < this.rows.length - 1) {
				console.log(" ".repeat(textWidth + 1) + "|")
			}
		}

		const X_LABEL_WIDTH = 8
		let xLabelAmount = Math.floor(barWidth/X_LABEL_WIDTH)
		let xLabels = Array(xLabelAmount+1).fill(0).map((_, i) => (i/(width/X_LABEL_WIDTH))*maxYVal)
		let xLabelStrings = xLabels.map(x => padCenter(x.toFixed(2), X_LABEL_WIDTH))
		console.log(" ".repeat(textWidth + 1) + "├" + ("─".repeat(X_LABEL_WIDTH - 1) + "┬").repeat(xLabelAmount))
		console.log(" ".repeat(textWidth + 1 - X_LABEL_WIDTH/2) + xLabelStrings.join(""))
		console.log()
	}

	plot(x: keyof T = this.headers[0], ys?: (keyof T)[]) {
		if (ys === undefined) {
			ys = this.headers.filter(k => k !== x)
		}

		const parts = process.stdout.columns - 20;
		const height = Math.round(parts*0.25)

		let sorted = this.sortBy(x)
		let xs = sorted.column(x)
		let [xMin, xMax] = [xs[0], xs[xs.length-1]]
		let linearXs = Array(parts).fill(0).map((_, i) => xMin + (xMax - xMin)/parts * i)

		let values: {[columnName: string]: number[]} = Object.fromEntries(ys.map(name => [name, []]))
		for (let i = 0; i < parts; i++) {
			let biggerRowIndex = xs.findIndex(x => x > linearXs[i])
			if (biggerRowIndex === -1) biggerRowIndex = xs.length-1
			let biggerRow = sorted.rows[biggerRowIndex]

			let smallerRowIndex = biggerRowIndex-1
			if (smallerRowIndex < 0) smallerRowIndex = 0
			let smallerRow = sorted.rows[smallerRowIndex]

			let interpolator = (biggerRow[x] - linearXs[i])/(biggerRow[x] - smallerRow[x])

			for(let columnName of ys) {
				values[columnName as string].push((1-interpolator)*biggerRow[columnName] + interpolator*smallerRow[columnName])
			}
		}

		const X_LABEL_WIDTH = 8

		let plotString = plot(
			Object.values(values),
			{
				height: height,
				colors: COLORS,
			}
		)
		let plotWidth = widthIgnoreANSI(plotString.split("\n")[0])

		let offset = plotString.split("").findIndex((_s, i) => plotString[i] == " " && plotString.at(i-1)?.match(/\d/)) + 2
		let dataWidth = plotWidth - offset

		let legendString = ys.map((name, i) => COLORS[i] + String(name) + RESET).join(", ")
		legendString = `Plot of ${legendString} with respect to ${String(x)}`
		legendString = " ".repeat(Math.max(0, (plotWidth - widthIgnoreANSI(legendString))/2)) + legendString

		let xLabelAmount = Math.ceil(dataWidth / X_LABEL_WIDTH)
		let xLabels = Array(xLabelAmount+1).fill(0).map((_, i) => (i/(dataWidth/X_LABEL_WIDTH))*(xMax-xMin) + xMin)
		let xLabelStrings = xLabels.map(x => padCenter(x.toFixed(2), X_LABEL_WIDTH))

		console.log(legendString)
		console.log(plotString)
		console.log(" ".repeat(offset-1) + "├" + ("─".repeat(X_LABEL_WIDTH - 1) + "┬").repeat(xLabelAmount))
		console.log(" ".repeat(Math.floor(offset - X_LABEL_WIDTH/2)) + xLabelStrings.join(""))
		console.log()
	}
}
