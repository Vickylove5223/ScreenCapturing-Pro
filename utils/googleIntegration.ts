/** Fix: Added DOM library reference to resolve missing browser global properties */
/// <reference lib="dom" />

// NOTE: We only use the Client ID in the frontend. The Client Secret is NOT safe to use in browser-side code.
// The Implicit Grant flow / Token Model handles this securely without the secret.
const CLIENT_ID = '104046752889-schirpg4cp1ckr4i587dmc97qhlkmjnt.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/youtube.upload';

interface TokenResponse {
  access_token: string;
  error?: string;
}

/**
 * Authenticates the user with Google using the new Identity Services SDK.
 * Returns a Promise that resolves to the Access Token.
 */
export const authenticateGoogle = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).google === 'undefined') {
      return reject(new Error("Google Identity Services script not loaded. Check your internet connection."));
    }

    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: TokenResponse) => {
        if (resp.error) {
          reject(new Error(`Authentication failed: ${resp.error}`));
        } else {
          resolve(resp.access_token);
        }
      },
    });

    // Prompt the user to select an account and grant consent
    tokenClient.requestAccessToken();
  });
};

/**
 * Performs a Resumable Upload to Google Drive.
 */
export const uploadToDrive = async (
  blob: Blob, 
  filename: string, 
  accessToken: string,
  onProgress: (percent: number) => void
): Promise<string> => {
  const metadata = {
    name: filename,
    mimeType: blob.type
  };

  // 1. Initiate Resumable Upload Session
  const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!initRes.ok) throw new Error(`Drive Init Failed: ${initRes.statusText}`);
  
  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error("Failed to get Drive upload location.");

  // 2. Perform the Upload using XHR to track progress
  const fileId = await performXhrUpload(uploadUrl, blob, onProgress);
  
  // Return a viewable link
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
};

/**
 * Performs a Resumable Upload to YouTube.
 */
export const uploadToYouTube = async (
  blob: Blob, 
  title: string, 
  accessToken: string,
  onProgress: (percent: number) => void
): Promise<string> => {
  const metadata = {
    snippet: {
      title: title,
      description: "Recorded and edited with ScreenCapturing Pro",
      tags: ["screencapture", "vibe"]
    },
    status: {
      privacyStatus: "unlisted" // Default to unlisted for safety
    }
  };

  // 1. Initiate Resumable Upload Session
  const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!initRes.ok) throw new Error(`YouTube Init Failed: ${initRes.statusText}`);

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error("Failed to get YouTube upload location.");

  // 2. Perform the Upload
  const videoId = await performXhrUpload(uploadUrl, blob, onProgress);

  return `https://youtu.be/${videoId}`;
};

/**
 * Helper: Uploads binary data via XHR to support progress tracking.
 */
const performXhrUpload = (url: string, blob: Blob, onProgress: (p: number) => void): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', blob.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.id);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));

    xhr.send(blob);
  });
};
