<script lang="ts">
	import { markedKatexExtension } from '$lib/markdown/katex-extension'
	import {
		marked,
		type TokenizerExtensionFunction,
		type Tokens,
	} from 'marked'
	import MarkdownRenderer from './markdown-renderer.svelte'

	let { content, id }: { content: string; id: string } = $props()

	// content =
	// 	"Okay, let's break down Python's `for` loops.\n\n**Core Concept**\n\nA `for` loop in Python is designed to iterate over a sequence (like a list, tuple, string, or range) or other iterable object. It executes a block of code repeatedly, once for each item in the sequence.\n\n**Basic Syntax**\n\n```python\nfor item in sequence:\n # Code to be executed for each item\n # You can use the 'item' variable within this block\n```\n\n* **`for` keyword:** This signals the start of the loop.\n* **`item`:** …: 0, j: 1\ni: 1, j: 0\ni: 1, j: 1\ni: 2, j: 0\ni: 2, j: 1\n```\n\n**Key Points**\n\n* `for` loops are used for iterating over sequences or iterables.\n* Indentation is crucial in Python to define the loop's body.\n* `range()` is commonly used to generate a sequence of numbers for looping.\n* `break` and `continue` provide control over the loop's execution.\n* The `else` clause executes if the loop completes without a `break`.\n* Nested loops allow you to iterate over multiple levels of data.\n"
	// content = '$10 bucks and $20 bucks $$10$$'
	// content = ''
	// content =
	// 	"Certainly! Here's a simple example of a Python \`for\` loop that prints the numbers from 1 to 10:\n\`\`\`python\n# Loop through the range of numbers from 1 to 10\nfor number in range(1, 11):\nprint(number)\n\`\`\`\n\n### Explanation:\n- \`range(1, 11)\` generates numbers starting from 1 up to (but not including) 11.\n- The \`for\` loop iterates through each number in that range, and the \`print\` function outputs each number.\n\nIf you have a specific task in mind that you would like to perform using a \`for\` loop, let me know, and I can provide a more tailored example!\n"
	// content =
	// 	'Okay, we have the equation:\n\n$$x + y = 2$$\n\nWhat would you like to do with this equation? For example, are you trying to:'

	const options = {
		throwOnError: false,
	}
	marked.use(markedKatexExtension(options))
	let tokens = $derived(marked.lexer(content))
</script>

{#key id}
	<div
		class="prose prose-neutral dark:prose-invert prose-p:my-0 prose-pre:m-0 prose-pre:bg-transparent prose-pre:rounded-t-none">
		<MarkdownRenderer {tokens} />
	</div>
{/key}
