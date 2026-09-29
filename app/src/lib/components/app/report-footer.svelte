<script lang="ts">
	import { footerTimestamp } from '$lib/format.js';
</script>

<!-- The page numbers print in the page margin; see .report-page:has(.footer). -->
<div class="footer">
	<span>{footerTimestamp()}</span>
</div>
