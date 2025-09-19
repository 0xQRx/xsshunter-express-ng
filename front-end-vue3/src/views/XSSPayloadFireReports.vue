<template>
  <div>
    <div class="row">
      <div class="col-12">
        <Card class="xss-card-container">
          <div class="card-content-wrapper">
            <div>
              <h1>
                <i class="fas fa-fire"></i> XSS Payload Fire Reports
                ({{ formatWithCommas(reportCount) }} Total)
              </h1>
              <hr />
              
              <!-- Card Grid Layout -->
              <div class="payload-cards-grid">
                <div v-for="report in payloadFireReports" :key="report.id" class="payload-card-wrapper">
                  <Card class="payload-card">
                    <!-- Screenshot Section -->
                    <div class="card-screenshot">
                      <div v-if="!imageErrors[report.screenshot_id]" class="screenshot-container">
                        <img
                          :src="`${baseApiPath}/screenshots/${report.screenshot_id}.png`"
                          alt="XSS Screenshot"
                          @error="handleImageError(report.screenshot_id)"
                          @load="handleImageLoad($event, report.screenshot_id)"
                          @click="openReportModal(report)"
                        />
                      </div>
                      <div v-else class="screenshot-placeholder-grid" @click="openReportModal(report)">
                        <i class="fas fa-image fa-2x"></i>
                        <small>No screenshot</small>
                      </div>
                      
                      <!-- Time Badge -->
                      <div class="time-badge">
                        {{ formatTimeAgo(report.createdAt) }}
                      </div>
                    </div>
                    
                    <!-- Card Content -->
                    <div class="card-content">
                      <div class="url-section">
                        <code class="url-text">{{ truncateUrl(report.url, 50) }}</code>
                      </div>
                      
                      <!-- Action Buttons -->
                      <div class="card-actions">
                        <BaseButton
                          class="view-btn"
                          simple
                          type="primary"
                          size="sm"
                          @click="openReportModal(report)"
                        >
                          <i class="fas fa-eye"></i> View
                        </BaseButton>
                        <BaseButton
                          class="delete-btn"
                          simple
                          type="danger"
                          size="sm"
                          @click="deletePayloadFire(report.id)"
                        >
                          <i class="fas fa-trash"></i>
                        </BaseButton>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
              
              <!-- Pagination -->
              <div class="text-center pagination-div">
                <BasePagination v-model="page" :page-count="totalPages" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
    
    <!-- Loading bar -->
    <div class="loading-bar" v-if="loading">
      <div class="progress">
        <div
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="100"
          class="progress-bar bg-primary-theme progress-bar-striped progress-bar-animated"
          style="width: 100%;"
        ></div>
      </div>
    </div>
    
    <!-- Report Details Modal -->
    <Modal
      v-model="showReportModal"
      :show-close="false"
      modal-classes="modal-xl modal-black"
      :centered="true"
      @close="closeReportModal"
    >
      <template #header>
        <div class="modal-header-wrapper">
          <div class="modal-header-content">
            <h4 class="modal-title" v-if="selectedReport">
              <i class="fas fa-fire"></i> XSS Report Details
            </h4>
            <p class="mb-0 modal-url" style="font-size: 14px;">
              <code style="color: #5dade2;">{{ selectedReport?.url }}</code>
            </p>
          </div>
          <BaseButton 
            type="info" 
            size="sm"
            @click="compactView = !compactView"
            class="compact-toggle-btn hide-mobile-text"
          >
            <i :class="compactView ? 'fas fa-expand' : 'fas fa-compress'"></i> <span>{{ compactView ? 'Full' : 'Compact' }}</span>
          </BaseButton>
        </div>
      </template>
      
      <div v-if="selectedReport" class="report-modal-content" :class="{ 'compact-view': compactView }">
        <!-- Screenshot -->
        <div class="report-section" :class="{ 'compact-screenshot': compactView }">
          <p class="report-section-label">Screenshot</p>
          <small class="text-muted">Screenshot of the vulnerable page.</small>
          <div class="mt-2">
            <div v-if="!imageErrors[selectedReport.screenshot_id]" class="screenshot-image-container">
              <a
                :href="`${baseApiPath}/screenshots/${selectedReport.screenshot_id}.png`"
                target="_blank"
              >
                <img
                  class="report-image"
                  :src="`${baseApiPath}/screenshots/${selectedReport.screenshot_id}.png`"
                  alt="XSS Screenshot"
                  style="width: 100%; height: auto;"
                  @error="handleImageError(selectedReport.screenshot_id)"
                  @load="handleImageLoad($event, selectedReport.screenshot_id)"
                />
              </a>
            </div>
            <div v-else class="screenshot-placeholder">
              <i class="fas fa-image fa-3x mb-3"></i>
              <p class="mb-2">Screenshot capture failed</p>
              <small class="text-muted">Common with single-page applications that render content dynamically (React, Vue, Angular, etc.)</small>
            </div>
          </div>
        </div>
        <hr />
        
        <!-- URL -->
        <div class="report-section">
          <p class="report-section-label">URL</p>
          <small class="text-muted">The URL of the page the payload fired on.</small>
          <div class="mt-2">
            <code>{{ selectedReport.url || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- Injection Key -->
        <div class="report-section">
          <p class="report-section-label">Injection Key</p>
          <small class="text-muted">Unique identifier used to track which injection attempt triggered this XSS.</small>
          <div class="mt-2">
            <code>{{ selectedReport.injection_key || 'default' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- IP Address -->
        <div class="report-section">
          <p class="report-section-label">IP Address</p>
          <small class="text-muted">Remote IP address of the victim.</small>
          <div class="mt-2">
            <code>{{ selectedReport.ip_address || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- Referer -->
        <div class="report-section">
          <p class="report-section-label">Referer</p>
          <small class="text-muted">Referring page for the vulnerable page.</small>
          <div class="mt-2">
            <code>{{ selectedReport.referer || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- User Agent -->
        <div class="report-section">
          <p class="report-section-label">User-Agent</p>
          <small class="text-muted">Web browser of the victim.</small>
          <div class="mt-2">
            <code>{{ selectedReport.user_agent || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- Cookies -->
        <div class="report-section">
          <p class="report-section-label">Cookies</p>
          <small class="text-muted">Non-HTTPOnly cookies of the victim.</small>
          <div class="mt-2">
            <code>{{ selectedReport.cookies || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- Local Storage -->
        <div class="report-section">
          <p class="report-section-label">Local Storage</p>
          <small class="text-muted">Captured local storage data from the victim's browser.</small>
          <div class="mt-2">
            <ul v-if="selectedReport.local_storage && selectedReport.local_storage.length">
              <li v-for="(item, index) in selectedReport.local_storage" :key="index">
                <span class="storage-key">{{ item.key }}:</span>
                <code>{{ item.value }}</code>
              </li>
            </ul>
            <pre v-else><i>None</i></pre>
          </div>
        </div>
        <hr />
        
        <!-- Session Storage -->
        <div class="report-section">
          <p class="report-section-label">Session Storage</p>
          <small class="text-muted">Captured session storage data from the victim's browser.</small>
          <div class="mt-2">
            <ul v-if="selectedReport.session_storage && selectedReport.session_storage.length">
              <li v-for="(item, index) in selectedReport.session_storage" :key="index">
                <span class="storage-key">{{ item.key }}:</span>
                <code>{{ item.value }}</code>
              </li>
            </ul>
            <pre v-else><i>None</i></pre>
          </div>
        </div>
        <hr />
        
        <!-- Custom Scripts Data -->
        <div v-if="parsedCustomData.length > 0 && !compactView" class="report-section custom-data-section">
          <p class="report-section-label">
            Custom Scripts Data 
            <span v-if="parsedCustomData.length > customDataPerPage" class="text-muted" style="font-size: 14px;">
              ({{ parsedCustomData.length }} total items)
            </span>
          </p>
          <small class="text-muted">Data collected by custom payload scripts using addCustomData().</small>
          
          <!-- Pagination controls at top if needed -->
          <div v-if="showCustomDataPagination" class="custom-data-pagination mt-2 mb-3">
            <div class="pagination-info">
              Showing items {{ (customDataPage - 1) * customDataPerPage + 1 }} - 
              {{ Math.min(customDataPage * customDataPerPage, parsedCustomData.length) }}
            </div>
            <div class="pagination-controls">
              <BaseButton
                size="sm"
                type="secondary"
                :disabled="customDataPage === 1"
                @click="handleCustomDataPageChange(customDataPage - 1)"
                class="pagination-btn"
              >
                <i class="fas fa-chevron-left"></i> <span class="btn-text">Previous</span>
              </BaseButton>
              <span class="page-indicator">
                Page {{ customDataPage }} of {{ customDataTotalPages }}
              </span>
              <BaseButton
                size="sm"
                type="secondary"
                :disabled="customDataPage === customDataTotalPages"
                @click="handleCustomDataPageChange(customDataPage + 1)"
                class="pagination-btn"
              >
                <span class="btn-text">Next</span> <i class="fas fa-chevron-right"></i>
              </BaseButton>
            </div>
          </div>
          
          <div class="mt-3">
            <div v-for="(dataItem, index) in paginatedCustomData" :key="`${customDataPage}-${index}`" class="mb-3">
              <h5 class="text-primary">{{ dataItem.title }}</h5>
              <CodeEditor
                :model-value="formatCustomDataObject(dataItem.data)"
                :readonly="true"
                class="xss-report-codemirror custom-data-editor"
              />
              <small class="text-muted">
                Collected at: {{ new Date(dataItem.timestamp).toLocaleString() }}
              </small>
            </div>
          </div>
          
          <!-- Pagination controls at bottom if needed -->
          <div v-if="showCustomDataPagination && parsedCustomData.length > 6" class="custom-data-pagination mt-3">
            <div class="pagination-controls">
              <BaseButton
                size="sm"
                type="secondary"
                :disabled="customDataPage === 1"
                @click="handleCustomDataPageChange(customDataPage - 1)"
                class="pagination-btn"
              >
                <i class="fas fa-chevron-left"></i> <span class="btn-text">Previous</span>
              </BaseButton>
              <span class="page-indicator">
                Page {{ customDataPage }} of {{ customDataTotalPages }}
              </span>
              <BaseButton
                size="sm"
                type="secondary"
                :disabled="customDataPage === customDataTotalPages"
                @click="handleCustomDataPageChange(customDataPage + 1)"
                class="pagination-btn"
              >
                <span class="btn-text">Next</span> <i class="fas fa-chevron-right"></i>
              </BaseButton>
            </div>
          </div>
        </div>
        <hr v-if="parsedCustomData.length > 0" />
        
        <!-- Title -->
        <div class="report-section">
          <p class="report-section-label">Title</p>
          <small class="text-muted">Vulnerable page's title.</small>
          <div class="mt-2">
            <code>{{ selectedReport.title || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- DOM HTML -->
        <div class="report-section" v-if="!compactView">
          <p class="report-section-label">DOM HTML</p>
          <small class="text-muted">HTML of the vulnerable page.</small>
          <div class="mt-2">
            <CodeEditor
              v-if="selectedReport.dom && selectedReport.dom.length < 10000"
              :model-value="selectedReport.dom"
              :readonly="true"
              language="html"
              class="xss-report-codemirror"
            />
            <div v-else>
              <h4>
                <i class="fas fa-exclamation-triangle"></i>
                Page HTML too large to display inline, please use one of the options below.
              </h4>
              <div class="button-group-responsive">
                <BaseButton
                  simple
                  type="primary"
                  class="mt-3 ml-1 mr-1 hide-mobile-text"
                  @click="viewHtmlInNewTab(selectedReport.dom)"
                >
                  <i class="fas fa-external-link-alt"></i> <span>Render Page in New Tab</span>
                </BaseButton>
                <BaseButton
                  simple
                  type="primary"
                  class="mt-3 ml-1 mr-1 hide-mobile-text"
                  @click="downloadHtml(selectedReport.dom)"
                >
                  <i class="fas fa-download"></i> <span>Download Raw HTML</span>
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
        <hr />
        
        <!-- Text -->
        <div class="report-section">
          <p class="report-section-label">Text</p>
          <small class="text-muted">Text of the vulnerable page.</small>
          <div class="mt-2">
            <CodeEditor
              v-if="selectedReport.text"
              :model-value="selectedReport.text"
              :readonly="true"
              class="xss-report-codemirror"
            />
            <pre v-else><i>None</i></pre>
          </div>
        </div>
        <hr />
        
        <!-- Origin -->
        <div class="report-section">
          <p class="report-section-label">Origin</p>
          <small class="text-muted">Origin of the page.</small>
          <div class="mt-2">
            <code>{{ selectedReport.origin || 'None' }}</code>
          </div>
        </div>
        <hr />
        
        <!-- Browser Time -->
        <div class="report-section">
          <p class="report-section-label">Browser Timestamp</p>
          <small class="text-muted">Reported time according to the victim's browser.</small>
          <div class="mt-2">
            <code v-if="selectedReport.browser_timestamp">
              {{ formatDate(parseInt(selectedReport.browser_timestamp)) }}
              (<i>{{ selectedReport.browser_timestamp }}</i>)
            </code>
            <pre v-else><i>None</i></pre>
          </div>
        </div>
        <hr />
        
        <!-- Other Info -->
        <div class="report-section">
          <p class="report-section-label">Other</p>
          <small class="text-muted">Other miscellaneous information.</small>
          <div class="mt-2">
            <p><span class="info-label">Fired in iFrame?:</span> <code>{{ selectedReport.was_iframe }}</code></p>
            <p><span class="info-label">Vulnerability enumerated:</span> <code>{{ formatDate(selectedReport.createdAt) }}</code></p>
            <p><span class="info-label">Report ID:</span> <code>{{ selectedReport.id }}</code></p>
          </div>
        </div>
      </div>
      
      <template #footer>
        <BaseButton type="secondary" @click="closeReportModal">
          Close
        </BaseButton>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import DOMPurify from 'dompurify'
import Card from '@/components/Cards/Card.vue'
import BaseButton from '@/components/BaseButton.vue'
import BasePagination from '@/components/BasePagination.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import Modal from '@/components/Modal.vue'
import * as api from '@/services/api'
import { setLoadingHandler } from '@/services/api'

dayjs.extend(relativeTime)

// Data
const loading = ref(false)
const baseApiPath = ref('')
const page = ref(1)
const limit = 6  // Changed to 6 for better grid layout
const showReportModal = ref(false)
const selectedReport = ref<any>(null)
const payloadFireReports = ref<any[]>([])
const reportCount = ref(0)
const imageErrors = ref<Record<string, boolean>>({})
const customDataPage = ref(1)
const compactView = ref(false)  // Toggle for compact view
const customDataPerPage = 3

// Set loading handler
setLoadingHandler((isLoading: boolean) => {
  loading.value = isLoading
})

// Computed
const totalPages = computed(() => {
  return Math.ceil(reportCount.value / limit)
})

const parsedCustomData = computed(() => {
  if (!selectedReport.value?.custom_data || selectedReport.value.custom_data === '[]') {
    return []
  }
  return parseCustomData(selectedReport.value.custom_data)
})

const paginatedCustomData = computed(() => {
  const allData = parsedCustomData.value
  if (allData.length <= customDataPerPage) {
    return allData
  }
  const start = (customDataPage.value - 1) * customDataPerPage
  const end = start + customDataPerPage
  return allData.slice(start, end)
})

const customDataTotalPages = computed(() => {
  return Math.ceil(parsedCustomData.value.length / customDataPerPage)
})

const showCustomDataPagination = computed(() => {
  return parsedCustomData.value.length > customDataPerPage
})

// Methods
const formatWithCommas = (inputNumber: number) => {
  return inputNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

const formatTimeAgo = (date: string) => {
  return dayjs(date).fromNow()
}

const formatDate = (date: string | number) => {
  return dayjs(date).format('dddd, MMMM D YYYY, h:mm:ss a')
}

const deletePayloadFire = async (payloadId: string) => {
  await api.delete_payload_fires([payloadId])
  await pullPayloadFireReports()
}

const pullPayloadFireReports = async () => {
  const reports = await api.get_payload_fires(page.value, limit)
  payloadFireReports.value = reports.result.payload_fires
  reportCount.value = reports.result.total
}

const openReportModal = (report: any) => {
  selectedReport.value = report
  showReportModal.value = true
  customDataPage.value = 1  // Reset custom data pagination
}

const closeReportModal = () => {
  showReportModal.value = false
  selectedReport.value = null
  customDataPage.value = 1  // Reset custom data pagination
}

const viewHtmlInNewTab = (inputHtml: string) => {
  const newWindow = window.open('about:blank', '_blank')
  if (newWindow) {
    // Sanitize HTML to prevent XSS attacks while preserving safe HTML structure
    const sanitizedHtml = DOMPurify.sanitize(inputHtml, {
      WHOLE_DOCUMENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      FORCE_BODY: false,
      ADD_TAGS: ['link', 'style'],
      ADD_ATTR: ['target', 'rel'],
      ALLOW_DATA_ATTR: true,
      ALLOW_UNKNOWN_PROTOCOLS: false
    })
    newWindow.document.write(sanitizedHtml)
    newWindow.document.close()
  }
}

const downloadHtml = (inputHtml: string) => {
  // Sanitize HTML before creating download link
  const sanitizedHtml = DOMPurify.sanitize(inputHtml, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: false,
    ADD_TAGS: ['link', 'style'],
    ADD_ATTR: ['target', 'rel'],
    ALLOW_DATA_ATTR: true,
    ALLOW_UNKNOWN_PROTOCOLS: false
  })
  const link = document.createElement('a')
  link.href = `data:text/html,${encodeURIComponent(sanitizedHtml)}`
  link.download = 'xss-page-contents.html'
  link.click()
}

const parseCustomData = (customDataString: string) => {
  try {
    if (!customDataString || customDataString === '[]') return []
    return JSON.parse(customDataString)
  } catch (e) {
    console.error('Error parsing custom data:', e)
    return []
  }
}

const formatCustomDataObject = (obj: any) => {
  try {
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return String(obj)
  }
}

const handleImageError = (screenshotId: string) => {
  imageErrors.value[screenshotId] = true
}

const handleImageLoad = (event: Event, screenshotId: string) => {
  const img = event.target as HTMLImageElement
  // Check if image actually loaded with content (not a 1x1 pixel or very small)
  if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
    imageErrors.value[screenshotId] = true
  } else {
    // Image loaded successfully
    delete imageErrors.value[screenshotId]
  }
}

const truncateUrl = (url: string, maxLength: number = 50) => {
  if (!url) return 'No URL'
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength) + '...'
}

const handleCustomDataPageChange = (newPage: number) => {
  customDataPage.value = newPage
  // Scroll to the top of the custom data section
  setTimeout(() => {
    const customDataSection = document.querySelector('.modal-body .custom-data-section')
    if (customDataSection) {
      customDataSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      // Fallback: scroll modal to top
      const modalBody = document.querySelector('.modal-body')
      if (modalBody) {
        modalBody.scrollTop = modalBody.scrollTop - 400 // Scroll up by approximate custom data height
      }
    }
  }, 50)
}

// Watch
watch(page, async (oldVal, newVal) => {
  await pullPayloadFireReports()
  
  if (oldVal !== newVal) {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
  }
})

// Mounted
onMounted(async () => {
  baseApiPath.value = api.BASE_API_PATH
  await pullPayloadFireReports()
})
</script>

<style scoped lang="scss">
@import '@/assets/sass/views/xss-payload-fire-reports';
@import '@/assets/sass/mobile-responsive';

// Modal header responsive layout
.modal-header-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  gap: 12px;
  
  .modal-header-content {
    flex: 1;
    min-width: 0; // Allow content to shrink
    
    .modal-url {
      word-break: break-all;
    }
  }
  
  .compact-toggle-btn {
    flex-shrink: 0;
  }
}

// Compact view styles for better screenshots
.compact-view {
  .report-section {
    padding: 8px 0;
    margin-bottom: 8px;
    
    .report-section-label {
      font-size: 13px;
      margin-bottom: 4px;
    }
    
    small.text-muted {
      display: none; // Hide descriptions in compact view
    }
    
    code {
      font-size: 11px;
      word-break: break-all;
    }
    
    pre {
      max-height: 100px;
      overflow-y: auto;
      font-size: 11px;
    }
    
    // Compact screenshot styling
    &.compact-screenshot {
      .screenshot-image-container {
        max-width: 300px;
        margin: 0 auto;
        
        img {
          max-height: 200px;
          object-fit: contain;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
      }
      
      .screenshot-placeholder {
        max-width: 300px;
        height: 150px;
        margin: 0 auto;
      }
    }
  }
  
  hr {
    margin: 8px 0;
  }
}

// Make modal more compact when in compact view
.modal-black .modal-content {
  &:has(.compact-view) {
    .modal-body {
      padding: 12px 20px;
    }
  }
}
</style>