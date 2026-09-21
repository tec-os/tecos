<script setup>
import Button from '@/components/ui/Button.vue';
import Tooltip from '@/components/ui/Tooltip.vue';
</script>

<template>

    <Tooltip content="Informação importante" position="right">
        <Button size="icon" variant="ghost">Teste</Button>
    </Tooltip>


</template>