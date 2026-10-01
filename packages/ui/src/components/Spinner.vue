<template>
  <svg class="spinner" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-opacity="0.25" stroke-width="1.5" />
    <path
      d="M14.25 8A6.25 6.25 0 0 0 8 1.75"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.spinner {
  width: 1em;
  height: 1em;
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
