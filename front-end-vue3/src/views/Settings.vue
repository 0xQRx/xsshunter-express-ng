<template>
  <div>
    <div class="row">
      <div class="col-12">
        <Card class="xss-card-container">
          <div class="card-content-wrapper">
            <div>
              <h1><i class="fas fa-cogs"></i> Settings</h1>
            </div>
            
            <!-- Injection Correlation API Key -->
            <Card>
              <h4 class="card-title">Injection Correlation API Key</h4>
              <h6 class="card-subtitle mb-2 text-muted">Use with an XSS Hunter compatible client to track which injection caused a payload fire.</h6>
              <p class="card-text">
                <BaseInput v-model="correlation_api_key" type="text" placeholder="..." readonly></BaseInput>
              </p>
              <div class="button-group-responsive">
                <BaseButton class="mr-1 hide-mobile-text" type="info" @click="copyApiKey">
                  <i class="far fa-copy"></i> <span>Copy API Key</span>
                </BaseButton>
                <BaseButton class="hide-mobile-text" type="danger" @click="generate_new_correlation_api_key">
                  <i class="fas fa-sync-alt"></i> <span>Rotate API Key</span>
                </BaseButton>
              </div>
            </Card>
            
            <!-- Master Password -->
            <Card>
              <h4 class="card-title">Master Password</h4>
              <h6 class="card-subtitle mb-2 text-muted">Change your login password for this XSS Hunter express instance.</h6>
              <p class="card-text">
                <BaseInput v-model="password" type="password" placeholder="*******************"></BaseInput>
              </p>
              <BaseButton type="success" class="hide-mobile-text" @click="update_password">
                <i class="fas fa-lock"></i> <span>Update Password</span>
              </BaseButton>
            </Card>
            
            <!-- Additional JavaScript to Chainload -->
            <Card>
              <h4 class="card-title">Additional JavaScript to Chainload (URL)</h4>
              <h6 class="card-subtitle mb-2 text-muted">Remote JavaScript to retrieve and evaluate after the original payload completes.</h6>
              <p class="card-text">
                <BaseInput v-model="chainload_uri" type="text" placeholder="https://example.com/remote.js"></BaseInput>
              </p>
              <div class="button-group-responsive">
                <BaseButton type="success" class="hide-mobile-text" @click="update_chainload_uri">
                  <i class="far fa-save"></i> <span>Save JavaScript URL</span>
                </BaseButton>
                <BaseButton type="danger" @click="clear_chainload_uri" class="ml-2 hide-mobile-text">
                  <i class="fas fa-trash-alt"></i> <span>Clear JavaScript URL</span>
                </BaseButton>
              </div>
            </Card>
            
            <!-- Pages to Collect on Payload Fire -->
            <Card>
              <h4 class="card-title">Pages to Collect on Payload Fire</h4>
              <h6 class="card-subtitle mb-2 text-muted">List of relative paths to collect from a site when a payload fires.</h6>
              <div class="form-row mobile-stack">
                <div class="col">
                  <BaseInput class="mt-1" type="text" placeholder="/robots.txt" v-model="new_page_to_collect" />
                </div>
                <div class="col">
                  <BaseButton type="success" class="hide-mobile-text w-100-mobile" @click="add_new_page_to_collect">
                    <i class="fas fa-plus"></i> <span>Add New Path to Collect</span>
                  </BaseButton>
                </div>
              </div>
              <p class="card-text mt-3">
                <select multiple class="form-control pages-select" v-model="selected_page_to_collect">
                  <option v-for="page_to_collect in pages_to_collect" :key="page_to_collect" :value="page_to_collect">
                    {{ page_to_collect }}
                  </option>
                </select>
              </p>
              <BaseButton type="danger" class="btn-sm mt-0 mb-3 hide-mobile-text" @click="delete_selected_pages_to_collect">
                <i class="fas fa-trash-alt"></i> <span>Delete Selected Path(s)</span>
              </BaseButton>
              <br />
              <BaseButton type="success" class="hide-mobile-text" @click="update_pages_to_collect">
                <i class="far fa-save"></i> <span>Update Pages to Collect List</span>
              </BaseButton>
            </Card>
            
            <!-- Miscellaneous Options -->
            <Card>
              <h4 class="card-title">Miscellaneous Options</h4>
              
              <!-- Revoke Sessions -->
              <BaseButton type="danger" class="hide-mobile-text" @click="revoke_all_sessions">
                <i class="fas fa-user-times"></i> <span>Revoke All Active Sessions</span>
              </BaseButton>
              <h6 class="mt-2 text-muted">Invalidates all active login sessions. This will log you out as well.</h6>
              <hr />
              
              <!-- Email Reporting -->
              <div v-if="send_alert_emails">
                <BaseButton 
                  type="warning" 
                  class="hide-mobile-text"
                  @click="set_email_reporting"
                  :disabled="!email_configured"
                  :title="!email_configured ? 'SMTP email is not configured. Set SMTP_EMAIL_NOTIFICATIONS_ENABLED=true and configure SMTP settings.' : ''">
                  <i class="far fa-bell-slash"></i> <span>Disable Email Reporting</span>
                </BaseButton>
                <h6 class="mt-2 text-muted">
                  <span v-if="!email_configured" class="text-warning">⚠️ SMTP not configured - </span>
                  Disable the sending of XSS payload fire reports to the specified email address.
                </h6>
              </div>
              <div v-else>
                <BaseButton 
                  type="success" 
                  class="hide-mobile-text"
                  @click="set_email_reporting"
                  :disabled="!email_configured"
                  :title="!email_configured ? 'SMTP email is not configured. Set SMTP_EMAIL_NOTIFICATIONS_ENABLED=true and configure SMTP settings.' : ''">
                  <i class="far fa-bell"></i> <span>Enable Email Reporting</span>
                </BaseButton>
                <h6 class="mt-2 text-muted">
                  <span v-if="!email_configured" class="text-warning">⚠️ SMTP not configured - </span>
                  Enable the sending of XSS payload fire reports to the specified email address.
                </h6>
              </div>
              
              <hr />
              
              <!-- Discord Reporting -->
              <div v-if="send_discord_alerts">
                <BaseButton 
                  type="warning" 
                  class="hide-mobile-text"
                  @click="set_discord_reporting"
                  :disabled="!discord_configured"
                  :title="!discord_configured ? 'Discord webhook is not configured. Set DISCORD_WEBHOOK_URL environment variable.' : ''">
                  <i class="fab fa-discord"></i> <span>Disable Discord Reporting</span>
                </BaseButton>
                <h6 class="mt-2 text-muted">
                  <span v-if="!discord_configured" class="text-warning">⚠️ Discord webhook not configured - </span>
                  Disable the sending of XSS payload fire reports to Discord webhook.
                </h6>
              </div>
              <div v-else>
                <BaseButton 
                  type="success" 
                  class="hide-mobile-text"
                  @click="set_discord_reporting"
                  :disabled="!discord_configured"
                  :title="!discord_configured ? 'Discord webhook is not configured. Set DISCORD_WEBHOOK_URL environment variable.' : ''">
                  <i class="fab fa-discord"></i> <span>Enable Discord Reporting</span>
                </BaseButton>
                <h6 class="mt-2 text-muted">
                  <span v-if="!discord_configured" class="text-warning">⚠️ Discord webhook not configured - </span>
                  Enable the sending of XSS payload fire reports to Discord webhook.
                </h6>
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from '@/components/Cards/Card.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/Inputs/BaseInput.vue'
import api_request from '@/services/api'
import { useToast } from '@/composables/useToast'
import logger from '@/utils/logger'

const { showSuccess, showError } = useToast()

// Data
const chainload_uri = ref('')
const correlation_api_key = ref('')
const pages_to_collect = ref<string[]>([])
const selected_page_to_collect = ref<string[]>([])
const new_page_to_collect = ref('')
const password = ref('')
const send_alert_emails = ref(true)
const send_discord_alerts = ref(true)
const email_configured = ref(false)
const discord_configured = ref(false)

// Methods
const update_password = async () => {
  if (password.value === '') {
    showError('Password is empty, please provide a valid password to continue.')
    return
  }
  await api_request.update_password(password.value)
  password.value = ''
  showSuccess('Your instance password has been updated.', 'Password Updated')
}

const generate_new_correlation_api_key = async () => {
  await api_request.generate_new_correlation_api_key()
  await pull_latest_settings()
  showSuccess('Your correlated injection API key has been rotated.', 'Correlated Injection API Key Rotated')
}

const pull_latest_settings = async () => {
  try {
    logger.debug('Fetching settings...')
    const settings_keys = [
      'chainload_uri',
      'correlation_api_key',
      'pages_to_collect',
      'send_alert_emails',
      'send_discord_alerts',
      'email_configured',
      'discord_configured'
    ]

    // Pull settings
    const settings_result = await api_request.get_settings()
    logger.debug('Settings result:', settings_result)
    
    if (settings_result && settings_result.result) {
      const settings = settings_result.result
      
      // Update reactive values
      chainload_uri.value = settings.chainload_uri || ''
      correlation_api_key.value = settings.correlation_api_key || ''
      pages_to_collect.value = settings.pages_to_collect || []
      send_alert_emails.value = settings.send_alert_emails !== undefined ? settings.send_alert_emails : true
      send_discord_alerts.value = settings.send_discord_alerts !== undefined ? settings.send_discord_alerts : true
      email_configured.value = settings.email_configured || false
      discord_configured.value = settings.discord_configured || false
      logger.debug('Settings loaded successfully')
    }
  } catch (error) {
    logger.error('Error fetching settings:', error)
  }
}

const update_chainload_uri = async () => {
  await api_request.set_chainload_uri(chainload_uri.value)
  await pull_latest_settings()
  showSuccess('Your chainload URI has been updated.', 'Chainload URI Updated')
}

const clear_chainload_uri = async () => {
  await api_request.set_chainload_uri("")
  await pull_latest_settings()
  showSuccess('Your chainload URI has been cleared.', 'Chainload URI Cleared')
}

const set_email_reporting = async () => {
  await api_request.set_email_alerts(!send_alert_emails.value)
  await pull_latest_settings()
  showSuccess('Your email reporting settings have been updated.', 'Email Reporting Updated')
}

const set_discord_reporting = async () => {
  await api_request.set_discord_alerts(!send_discord_alerts.value)
  await pull_latest_settings()
  showSuccess('Your Discord reporting settings have been updated.', 'Discord Reporting Updated')
}

const revoke_all_sessions = async () => {
  await api_request.revoke_all_sessions()
  showSuccess('All active sessions have been revoked.', 'All Active Sessions Revoked')
  setTimeout(() => {
    window.location.reload()
  }, 1500)
}

const add_new_page_to_collect = () => {
  let new_page = new_page_to_collect.value
  if (!new_page.startsWith('/')) {
    new_page = '/' + new_page
  }
  pages_to_collect.value.push(new_page)
  new_page_to_collect.value = ''
}

const delete_selected_pages_to_collect = () => {
  pages_to_collect.value = pages_to_collect.value.filter(page_to_collect => {
    return !selected_page_to_collect.value.includes(page_to_collect)
  })
}

const update_pages_to_collect = async () => {
  await api_request.update_pages_to_collect(pages_to_collect.value)
  await pull_latest_settings()
  showSuccess('Your pages to collect have been updated.', 'Pages to Collect Updated')
}

const copyApiKey = () => {
  navigator.clipboard.writeText(correlation_api_key.value)
  showSuccess('API key copied to clipboard')
}

// Mounted
onMounted(async () => {
  logger.debug('Settings component mounted')
  await pull_latest_settings()
})
</script>

<style scoped lang="scss">
@import '@/assets/sass/mobile-responsive';

.xss-card-container {
  max-width: 1200px;
  width: 100%;
}

.pages-select {
  background-color: #27293d;
  border: 1px solid #2b3553;
  color: rgba(255, 255, 255, 0.8);
  min-height: 150px;
  
  &:focus {
    background-color: #27293d;
    border-color: #e14eca;
    color: #ffffff;
    box-shadow: none;
  }
  
  option {
    padding: 5px;
    
    &:checked {
      background-color: #e14eca;
      color: #ffffff;
    }
  }
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
}

.btn:disabled:hover {
  transform: none !important;
}

.text-warning {
  color: #f4a261 !important;
  font-weight: 600;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  margin-right: -5px;
  margin-left: -5px;
}

.form-row > .col {
  padding-right: 5px;
  padding-left: 5px;
}

// Mobile responsiveness
// Mobile responsiveness - additional styles specific to this view
.mobile-stack {
  @media (max-width: $mobile) {
    flex-direction: column;
    
    .col {
      width: 100%;
      max-width: 100%;
      flex: none;
      margin-bottom: 0.5rem;
    }
  }
}

.w-100-mobile {
  @media (max-width: $mobile) {
    width: 100% !important;
  }
}

@media (max-width: $tablet) {
  .card-title {
    font-size: 1.2rem;
  }
  
  .card-subtitle {
    font-size: 0.9rem;
  }
}
</style>