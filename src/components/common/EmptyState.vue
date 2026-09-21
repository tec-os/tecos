<script setup>
import { Inbox } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';

defineProps({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    actionLabel: { type: String, default: '' },
});

defineEmits(['action']);
</script>

<template>
    <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-primary">
            <Inbox class="h-6 w-6" />
        </div>
        <h3 class="mt-4 font-semibold text-foreground">{{ title }}</h3>
        <p v-if="description" class="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{{ description }}</p>
        <Button v-if="actionLabel" class="mt-5" size="sm" @click="$emit('action')">{{ actionLabel }}</Button>
    </div>
</template>
