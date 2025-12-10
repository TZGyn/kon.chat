<script>
	import CsvIcon from './(icons)/CSV-icon.svelte'
	import DocIcon from './(icons)/DOC-icon.svelte'
	import PdfIcon from './(icons)/PDF-icon.svelte'
	import PptxIcon from './(icons)/PPTX-icon.svelte'
</script>

<div class="flex flex-1 items-center justify-center p-4">
	<div class="flex flex-wrap justify-center gap-8">
		<a href="/documents/pdf" data-sveltekit-preload-code="eager">
			<div
				class="bg-secondary hover:bg-accent flex h-48 w-44 flex-col items-center justify-center gap-8 rounded-lg border p-8">
				<PdfIcon class="size-16" />
				PDF
			</div>
		</a>
		<a href="/documents/sheets" data-sveltekit-preload-code="eager">
			<div
				class="bg-secondary hover:bg-accent flex h-48 w-44 flex-col items-center justify-center gap-8 rounded-lg border p-8">
				<CsvIcon class="size-16 text-green-500" />
				CSV/XSLX
			</div>
		</a>
		<!-- <a href="/documents/word" data-sveltekit-preload-code="eager">
			<div
				class="bg-secondary hover:bg-accent flex h-48 w-44 flex-col items-center justify-center gap-8 rounded-lg border p-8">
				<DocIcon class="size-16 text-blue-500" />
				WORD/DOCX
			</div>
		</a>
		<a href="/documents/pptx" data-sveltekit-preload-code="eager">
			<div
				class="bg-secondary hover:bg-accent flex h-48 w-44 flex-col items-center justify-center gap-8 rounded-lg border p-8">
				<PptxIcon class="size-16 text-orange-500" />
				PPTX
			</div>
		</a> -->
	</div>
</div>
