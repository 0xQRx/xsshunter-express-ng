export const BASE_API_PATH = ''  // Use relative paths
export const BASE_DOMAIN = window.location.hostname

// Loading state will be managed by a store or component
let setLoading: (loading: boolean) => void = () => {}

export function setLoadingHandler(handler: (loading: boolean) => void) {
  setLoading = handler
}

async function api_request(method: string, path: string, body?: any, isRetry = false): Promise<any> {
  const request_options: RequestInit = {
    method: method,
    credentials: 'include',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Buster': 'true'
    },
    redirect: 'follow'
  }
  
  if (body) {
    request_options.body = JSON.stringify(body)
  }
  
  setLoading(true)
  
  try {
    const response = await fetch(
      `${BASE_API_PATH}${path}`,
      request_options
    )
    
    setLoading(false)
    
    // Check if response is JSON
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const response_body = await response.json()
      return response_body
    } else {
      // If not JSON, likely got HTML (redirect to login or error page)
      console.error('Non-JSON response received:', response.status, response.statusText)
      
      // On first failure, retry once (session might need initialization)
      if (!isRetry) {
        console.log('Session may need initialization, retrying request...')
        // Longer delay to let session fully establish
        await new Promise(resolve => setTimeout(resolve, 500))
        return api_request(method, path, body, true)
      }
      
      throw new Error('Authentication required - please refresh the page and log in')
    }
  } catch (e) {
    setLoading(false)
    throw e
  }
}

export async function is_authenticated() {
  return api_request(
    'GET',
    `/api/v1/auth-check`,
    false
  )
}

export async function authenticate(password: string) {
  return api_request(
    'POST',
    `/api/v1/login`,
    {
      'password': password
    }
  )
}

export async function get_payload_fires(page: number, limit: number) {
  return api_request(
    'GET',
    `/api/v1/payloadfires?page=${page}&limit=${limit}`,
    false
  )
}

export async function delete_payload_fires(payload_id_array: string[]) {
  return api_request(
    'DELETE',
    `/api/v1/payloadfires`,
    {
      'ids': payload_id_array
    }
  )
}

export async function get_collect_pages(page: number, limit: number) {
  return api_request(
    'GET',
    `/api/v1/collected_pages?page=${page}&limit=${limit}`,
    false
  )
}

export async function delete_collect_pages(collected_pages_id_array: string[]) {
  return api_request(
    'DELETE',
    `/api/v1/collected_pages`,
    {
      'ids': collected_pages_id_array
    }
  )
}

export async function get_settings() {
  return api_request(
    'GET',
    `/api/v1/settings`,
    false
  )
}

export async function update_password(new_password: string) {
  return api_request(
    'PUT',
    `/api/v1/settings`,
    {
      "password": new_password,
    }
  )
}

export async function generate_new_correlation_api_key() {
  return api_request(
    'PUT',
    `/api/v1/settings`,
    {
      "correlation_api_key": true,
    }
  )
}

export async function set_chainload_uri(chainload_uri: string) {
  return api_request(
    'PUT',
    `/api/v1/settings`,
    {
      "chainload_uri": chainload_uri,
    }
  )
}

export async function set_email_alerts(send_alerts_bool: boolean) {
  return api_request(
    'PUT',
    `/api/v1/settings`,
    {
      "send_alert_emails": send_alerts_bool,
    }
  )
}

export async function set_discord_alerts(send_alerts_bool: boolean) {
  return api_request(
    'PUT',
    `/api/v1/settings`,
    {
      "send_discord_alerts": send_alerts_bool,
    }
  )
}

export async function revoke_all_sessions() {
  return api_request(
    'PUT',
    `/api/v1/settings`,
    {
      "revoke_all_sessions": true,
    }
  )
}

export async function update_pages_to_collect(pages_to_collect: string[]) {
  return api_request(
    'PUT',
    `/api/v1/settings`,
    {
      "pages_to_collect": pages_to_collect,
    }
  )
}

// Extension Console API functions
export async function get_extensions() {
  return api_request('GET', `/api/v1/extensions`, false)
}

export async function get_extension(id: string) {
  return api_request('GET', `/api/v1/extensions/${id}`, false)
}

export async function create_extension(extension: any) {
  return api_request('POST', `/api/v1/extensions`, extension)
}

export async function update_extension(id: string, extension: any) {
  return api_request('PUT', `/api/v1/extensions/${id}`, extension)
}

export async function delete_extension(id: string) {
  return api_request('DELETE', `/api/v1/extensions/${id}`, false)
}

export async function generate_test_token() {
  return api_request('POST', '/api/v1/generate-test-token', {})
}

export default {
  BASE_API_PATH,
  BASE_DOMAIN,
  api_request,
  is_authenticated,
  authenticate,
  get_payload_fires,
  delete_payload_fires,
  get_collect_pages,
  delete_collect_pages,
  get_settings,
  update_password,
  generate_new_correlation_api_key,
  set_chainload_uri,
  set_email_alerts,
  set_discord_alerts,
  revoke_all_sessions,
  update_pages_to_collect,
  // Extension Console
  get_extensions,
  get_extension,
  create_extension,
  update_extension,
  delete_extension,
  generate_test_token
}