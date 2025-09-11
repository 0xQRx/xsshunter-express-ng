<template>
  <div class="login-page">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-5 col-md-7">
          <Card class="bg-secondary">
            <div class="text-center mb-3">
              <h1 class="text-white">XSS Hunter Express</h1>
              <p class="text-lead text-light">Please login to continue.</p>
            </div>
            <BaseInput
              v-model="password"
              type="password"
              placeholder="Password"
              addon-left-icon="tim-icons icon-lock-circle"
              @keyup.enter="attemptLogin"
              :autofocus="true"
            />
            <div v-if="error" class="alert alert-danger">
              {{ error }}
            </div>
            <BaseButton
              type="primary"
              block
              @click="attemptLogin"
              :disabled="loading"
            >
              <span v-if="!loading">Login</span>
              <span v-else>Logging in...</span>
            </BaseButton>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import Card from '@/components/Cards/Card.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/Inputs/BaseInput.vue'
import { authenticate } from '@/services/api'

const router = useRouter()
const toast = useToast()

const password = ref('')
const loading = ref(false)
const error = ref('')

const attemptLogin = async () => {
  if (!password.value) {
    error.value = 'Please enter a password'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await authenticate(password.value)
    
    if (result.success) {
      toast.success('Login successful!')
      // Redirect to dashboard
      router.push('/xss')
    } else {
      if (result.code === 'INVALID_CREDENTIALS') {
        error.value = 'Invalid password'
      } else {
        error.value = result.error || 'Login failed'
      }
    }
  } catch (e) {
    console.error('Login error:', e)
    error.value = 'An error occurred during login'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
// Login page styles moved to global theme
</style>