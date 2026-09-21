<script setup>
import { ref } from 'vue';
import { CircleHelp } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';

defineProps({
    eyebrow: { type: String, default: '' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    tip: { type: String, default: '' },
});

const mostrarDica = ref(false);
</script>

<template>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
            <p v-if="eyebrow" class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-destructive">{{ eyebrow }}</p>
            <h1 class="text-2xl font-bold tracking-tight text-primary sm:text-3xl">{{ title }}</h1>
            <p v-if="description" class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{{ description }}</p>
            <div v-if="tip" class="mt-3">
                <Button variant="ghost" size="sm" class="h-7 gap-1.5 px-2 text-xs text-primary" :aria-expanded="mostrarDica" @click="mostrarDica = !mostrarDica">
                    <CircleHelp class="h-3.5 w-3.5" />
                    {{ mostrarDica ? 'Ocultar dica' : 'Como usar esta seção' }}
                </Button>
                <p v-if="mostrarDica" class="mt-2 max-w-2xl rounded-lg border border-[#c8d9ce] bg-[#eef3ee] px-3 py-2 text-sm leading-5 text-[#376056]">{{ tip }}</p>
            </div>
        </div>
        <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
            <slot name="actions" />
        </div>
    </div>
</template>
