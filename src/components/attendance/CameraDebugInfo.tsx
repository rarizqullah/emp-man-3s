"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, XCircle, Info } from 'lucide-react';

interface CameraDebugInfoProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  streamRef: React.RefObject<MediaStream | null>;
}

interface DebugInfo {
  video?: {
    exists: boolean;
    readyState?: number;
    videoWidth?: number;
    videoHeight?: number;
    clientWidth?: number;
    clientHeight?: number;
    paused?: boolean;
    muted?: boolean;
    autoplay?: boolean;
    playsInline?: boolean;
    currentTime?: number;
    duration?: number;
    srcObject: boolean;
  };
  stream?: {
    exists: boolean;
    active?: boolean;
    id?: string;
    tracks: number;
    videoTracks: number;
    audioTracks: number;
    settings?: MediaTrackSettings;
    constraints?: MediaTrackConstraints;
    capabilities?: MediaTrackCapabilities;
  };
  browser?: {
    userAgent: string;
    platform: string;
    online: boolean;
    cookieEnabled: boolean;
    language: string;
    hardwareConcurrency?: number;
  };
  apiSupport?: {
    getUserMedia: boolean;
    webRTC: boolean;
    webGL: boolean;
    canvas: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
  };
}

const CameraDebugInfo: React.FC<CameraDebugInfoProps> = ({ videoRef, streamRef }) => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [mediaDevices, setMediaDevices] = useState<MediaDeviceInfo[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateDebugInfo = () => {
      const video = videoRef.current;
      const stream = streamRef.current;
      
      setDebugInfo({
        // Video element info
        video: {
          exists: !!video,
          readyState: video?.readyState,
          videoWidth: video?.videoWidth,
          videoHeight: video?.videoHeight,
          clientWidth: video?.clientWidth,
          clientHeight: video?.clientHeight,
          paused: video?.paused,
          muted: video?.muted,
          autoplay: video?.autoplay,
          playsInline: video?.playsInline,
          currentTime: video?.currentTime,
          duration: video?.duration || 0,
          srcObject: !!video?.srcObject
        },
        // Stream info
        stream: {
          exists: !!stream,
          active: stream?.active,
          id: stream?.id,
          tracks: stream?.getTracks().length || 0,
          videoTracks: stream?.getVideoTracks().length || 0,
          audioTracks: stream?.getAudioTracks().length || 0,
          settings: stream?.getVideoTracks()[0]?.getSettings(),
          constraints: stream?.getVideoTracks()[0]?.getConstraints(),
          capabilities: stream?.getVideoTracks()[0]?.getCapabilities()
        },
        // Browser info
        browser: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          online: navigator.onLine,
          cookieEnabled: navigator.cookieEnabled,
          language: navigator.language,
          hardwareConcurrency: navigator.hardwareConcurrency
        },
        // API Support
        apiSupport: {
          getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
          webRTC: !!(window as any).RTCPeerConnection,
          webGL: (() => {
            try {
              const canvas = document.createElement('canvas');
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch {
              return false;
            }
          })(),
          canvas: !!document.createElement('canvas').getContext,
          localStorage: !!window.localStorage,
          sessionStorage: !!window.sessionStorage
        }
      });
    };

    // Update debug info every second
    const interval = setInterval(updateDebugInfo, 1000);
    updateDebugInfo();

    // Get media devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => setMediaDevices(devices))
        .catch(console.error);
    }

    return () => clearInterval(interval);
  }, [videoRef, streamRef]);

  const getReadyStateText = (state: number) => {
    switch (state) {
      case 0: return 'HAVE_NOTHING';
      case 1: return 'HAVE_METADATA';
      case 2: return 'HAVE_CURRENT_DATA';
      case 3: return 'HAVE_FUTURE_DATA';
      case 4: return 'HAVE_ENOUGH_DATA';
      default: return 'UNKNOWN';
    }
  };

  const testCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      console.log('Camera test successful:', stream);
      alert('Test kamera berhasil! Stream diperoleh.');
      
      // Stop test stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Camera test failed:', error);
      alert(`Test kamera gagal: ${error}`);
    }
  };

  const StatusIcon = ({ condition }: { condition: boolean }) => 
    condition ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;

  if (!isExpanded) {
    return (
      <div className="text-center mb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(true)}
          className="text-xs text-gray-500"
        >
          <Info className="w-3 h-3 mr-1" />
          Debug Camera Info
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Camera Debug Information</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(false)}
          >
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        {/* Quick Status */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between">
            <span>Video Element:</span>
            <StatusIcon condition={debugInfo.video?.exists} />
          </div>
          <div className="flex items-center justify-between">
            <span>Stream Active:</span>
            <StatusIcon condition={debugInfo.stream?.active} />
          </div>
          <div className="flex items-center justify-between">
            <span>Video Playing:</span>
            <StatusIcon condition={!debugInfo.video?.paused} />
          </div>
          <div className="flex items-center justify-between">
            <span>Video Size:</span>
            <span>{debugInfo.video?.videoWidth || 0}×{debugInfo.video?.videoHeight || 0}</span>
          </div>
        </div>

        {/* Video Details */}
        <div>
          <h4 className="font-medium mb-1">Video Element</h4>
          <div className="bg-gray-50 p-2 rounded text-xs">
            <div>Ready State: {getReadyStateText(debugInfo.video?.readyState || 0)}</div>
            <div>Dimensions: {debugInfo.video?.videoWidth || 0}×{debugInfo.video?.videoHeight || 0}</div>
            <div>Client Size: {debugInfo.video?.clientWidth || 0}×{debugInfo.video?.clientHeight || 0}</div>
            <div>Paused: {debugInfo.video?.paused ? 'Yes' : 'No'}</div>
            <div>Has Source: {debugInfo.video?.srcObject ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {/* Stream Details */}
        <div>
          <h4 className="font-medium mb-1">Stream Info</h4>
          <div className="bg-gray-50 p-2 rounded text-xs">
            <div>Active: {debugInfo.stream?.active ? 'Yes' : 'No'}</div>
            <div>Video Tracks: {debugInfo.stream?.videoTracks || 0}</div>
            <div>Audio Tracks: {debugInfo.stream?.audioTracks || 0}</div>
            {debugInfo.stream?.settings && (
              <div>Settings: {JSON.stringify(debugInfo.stream.settings, null, 2)}</div>
            )}
          </div>
        </div>

        {/* API Support */}
        <div>
          <h4 className="font-medium mb-1">Browser Support</h4>
          <div className="grid grid-cols-2 gap-1">
            <div className="flex items-center justify-between">
              <span>getUserMedia:</span>
              <StatusIcon condition={debugInfo.apiSupport?.getUserMedia} />
            </div>
            <div className="flex items-center justify-between">
              <span>WebGL:</span>
              <StatusIcon condition={debugInfo.apiSupport?.webGL} />
            </div>
            <div className="flex items-center justify-between">
              <span>Canvas:</span>
              <StatusIcon condition={debugInfo.apiSupport?.canvas} />
            </div>
            <div className="flex items-center justify-between">
              <span>WebRTC:</span>
              <StatusIcon condition={debugInfo.apiSupport?.webRTC} />
            </div>
          </div>
        </div>

        {/* Media Devices */}
        <div>
          <h4 className="font-medium mb-1">Available Cameras</h4>
          <div className="space-y-1">
            {mediaDevices.filter(device => device.kind === 'videoinput').map((device, index) => (
              <div key={device.deviceId} className="bg-gray-50 p-2 rounded">
                <div className="font-medium">{device.label || `Camera ${index + 1}`}</div>
                <div className="text-xs text-gray-500">{device.deviceId}</div>
              </div>
            ))}
            {mediaDevices.filter(device => device.kind === 'videoinput').length === 0 && (
              <div className="text-gray-500">No cameras found</div>
            )}
          </div>
        </div>

        {/* Test Button */}
        <div className="pt-2 border-t">
          <Button 
            onClick={testCamera} 
            size="sm" 
            variant="outline" 
            className="w-full"
          >
            <Camera className="w-3 h-3 mr-1" />
            Test Camera Access
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CameraDebugInfo; 