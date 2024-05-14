export function quartiles(numbers: number[]): [number, number, number, number, number] {
	numbers = structuredClone(numbers)
	numbers.sort((a, b) => a - b)

	return Array(5).fill(0).map((_, i) => numbers[Math.round((numbers.length-1)*i / 4)]) as any
}

export function avgAndStddev(numbers: number[]): [number, number] {
	let avg = numbers.reduce((a, b) => a + b, 0) / numbers.length
	let variance = numbers.reduce((a, b) => a + (b - avg)**2, 0) / numbers.length
	let stddev = Math.sqrt(variance)
	return [avg, stddev]
}
