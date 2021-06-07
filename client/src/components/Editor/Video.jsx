import { Button } from '@chakra-ui/button';
import { Input } from '@chakra-ui/input';
import { Text } from '@chakra-ui/layout';
import { Box, Flex, Stack } from '@chakra-ui/layout';
import { Select } from '@chakra-ui/select';
import { SliderTrack } from '@chakra-ui/slider';
import { SliderThumb } from '@chakra-ui/slider';
import { SliderFilledTrack } from '@chakra-ui/slider';
import { Slider } from '@chakra-ui/slider';
import { Spinner } from '@chakra-ui/spinner';
import React, { useEffect, useRef, useState } from 'react';
import { drawScaledImage, getTimeStamp, getWrapLines } from '../../utils';
import { useDebouncedCallback } from '../../utils/useDebouncedCallback';
import Canvas from '../VideoCanvas';
import ere from 'element-resize-event';

async function loadManifest(shareUrl) {
  const manifestRet = await fetch(`/proxy/${shareUrl}/manifest-path.json`);
  const manifest = await manifestRet.json();
  return manifest;
}

const MAX_HEIGHT = 450;

const Video = React.forwardRef(
  (
    { videoRef, sharePath, subtitle, color, aspectRatio, setManifestUrl },
    canvasRef
  ) => {
    const [canvasSize, setCanvasSize] = useState({ height: 360, width: 640 });
    const [videoSize, setVideoSize] = useState({ height: 360, width: 480 });
    const [wrapperSize, setWrapperSize] = useState({ height: 0, width: 0 });
    const [scale, setScale] = useState(1);

    const [videoLoading, setVideoLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [poster, setPoster] = useState(null);
    const [buffering, setBuffering] = useState();
    const [videoPlayed, setVideoPlayed] = useState(false);

    const wrapperRef = useRef();

    // const [color, setColor] = useState('#000000');
    const handleColorChange = useDebouncedCallback(
      value => color[1](value),
      200
    );

    async function init(vid) {
      let shareUrl = 'https://app.reduct.video/e/' + sharePath;

      if (shareUrl[shareUrl.length - 1] === '/') {
        shareUrl = shareUrl.slice(0, shareUrl.length - 1);
      }
      setPoster(`${shareUrl}/posterframe.jpg`);

      const manifest = await loadManifest(shareUrl);
      setManifestUrl(manifest);

      // Initialize Reduct player

      /* global Reduct */

      // console.log(`${shareUrl}/${manifest}`);
      const play = new Reduct.Player(vid);
      play.init(`/proxy/${shareUrl}/${manifest}`, {
        streaming: { bufferingGoal: 5, rebufferingGoal: 3 },
      });
      vid.onVideoRender?.();

      vid.onloadeddata = function (e) {
        console.log('loadedData');
        setVideoSize({ height: this.videoHeight, width: this.videoWidth });
        setVideoLoading(false);
      };

      vid.onwaiting = () => setBuffering(true);
      vid.onseeking = () => setBuffering(true);
      vid.oncanplay = () => setBuffering(false);

      vid.addEventListener('play', () => {
        setVideoPlayed(true);
        setIsPlaying(true);
      });
      vid.addEventListener('pause', () => setIsPlaying(false));
    }

    useEffect(() => {
      let vid = document.createElement('video');
      videoRef.current = vid;
      init(vid);
      return () => {
        if (vid) {
          vid.remove();
        }
        if (videoRef.current) {
          videoRef.current = null;
        }
      };
    }, [sharePath]);

    useEffect(() => {
      const wrapper = wrapperRef.current;

      setWrapperSize({
        width: wrapper.offsetWidth,
        height: wrapper.offsetHeight,
      });

      ere(wrapper, () => {
        console.log('here');
        setWrapperSize({
          width: wrapper.offsetWidth,
          height: wrapper.offsetHeight,
        });
      });
    }, []);

    useEffect(() => {
      function updateState() {
        let scale;
        if (canvasSize.width > canvasSize.height) {
          scale = wrapperSize.width / canvasSize.width;
        } else {
          scale = wrapperSize.height / canvasSize.height;
        }

        scale = Math.min(scale, MAX_HEIGHT / canvasSize.height);

        setScale(scale);
      }
      updateState();
    }, [wrapperSize, canvasSize]);

    function drawThumbnail(ctx) {
      if (!videoLoading && poster) {
        const image = new Image();
        image.onload = () => {
          image.style.objectFit = 'contain';
          ctx.imageSmoothingEnabled = false;
          drawScaledImage(ctx, image, canvasSize, {
            height: image.height,
            width: image.width,
          });
        };
        image.src = poster;
      }
    }

    function draw(ctx) {
      if (videoRef.current && !videoLoading) {
        if (!videoPlayed) {
          drawThumbnail(ctx);
        } else {
          drawScaledImage(ctx, videoRef.current, canvasSize, videoSize);
          ctx.font = '22px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.lineWidth = 4;
          ctx.miterLimit = 2;
          let textRender = false;
          subtitle.forEach(s => {
            if (
              s.start < videoRef.current.currentTime &&
              s.end > videoRef.current.currentTime &&
              !textRender
            ) {
              let lines = getWrapLines(ctx, s.text, canvasSize.width * 0.8);
              lines.reverse().forEach((line, i) => {
                ctx.strokeText(
                  line,
                  canvasSize.width / 2,
                  canvasSize.height - canvasSize.height * 0.1 - i * 24
                );
                ctx.fillText(
                  line,
                  canvasSize.width / 2,
                  canvasSize.height - canvasSize.height * 0.1 - i * 24
                );
              });
              textRender = true;
            }
          });
        }
      }
    }

    function handleDimensionsChange(e) {
      const ar = e.target.value;
      aspectRatio[1](ar);
      let height, width;

      switch (ar) {
        case '1:1':
          width = 640;
          height = 640;
          break;
        case '16:9':
          width = 640;
          height = 360;
          break;
        case '9:16':
          width = 360;
          height = 640;
          break;
        case '4:5':
          width = 360;
          height = 450;
          break;
        default:
          height = canvasSize.height;
          width = canvasSize.width;
      }

      setCanvasSize({ height, width });
    }

    const containerHeight = scale * canvasSize.height;
    const containerWidth = scale * canvasSize.width;

    return (
      <Flex
        flexDirection="column"
        // alignItems="center"
        justifyContent="flex-start"
        h="100%"
        w="100%"
        pt="4"
        margin="0 auto"
        overflow="hidden"
        ref={wrapperRef}
      >
        <Stack direction="row" px="6" py="4">
          <Button
            bg="white"
            onClick={() => {
              if (!videoRef.current) return;
              if (videoRef.current.paused) {
                videoRef.current.play();
              } else {
                videoRef.current.pause();
              }
            }}
          >
            {!isPlaying ? 'Play' : 'Pause'}
          </Button>
          <Select
            background="white"
            onChange={handleDimensionsChange}
            value={aspectRatio[0]}
          >
            <option value="1:1">1:1 Square</option>
            <option value="16:9">16:9 Horizontal</option>
            <option value="9:16">9:16 Vertical</option>
            <option value="4:5">4:5 Portrait</option>
          </Select>
          <Input
            background="white"
            type="color"
            value={color[0]}
            onChange={e => handleColorChange(e.target.value)}
          />
        </Stack>
        <Box>
          <Box
            style={{
              maxWidth: '100%',
              overflow: 'hidden',
              width: containerWidth + 'px',
              height: containerHeight + 'px',
              margin: '0 auto',
            }}
          >
            <Box
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                transform: 'scale(' + scale + ')',
                transformOrigin: '0 0 0',
              }}
            >
              <Box
                w={canvasSize.width}
                h={canvasSize.height}
                position="relative"
              >
                <Flex position="relative">
                  <Flex
                    justifyContent="center"
                    alignItems="center"
                    position="absolute"
                    h="100%"
                    w="100%"
                    bg="rgba(0,0,0,0.2)"
                    hidden={!(buffering || videoLoading)}
                  >
                    <Spinner color="teal" size="xl" thickness="8px" />
                  </Flex>
                  <Canvas
                    ref={canvasRef}
                    draw={draw}
                    height={canvasSize.height}
                    width={canvasSize.width}
                    color={color[0]}
                  />
                </Flex>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box className="spacer" flexGrow="1" />

        <Seeker video={videoRef.current} />
      </Flex>
    );
  }
);

export default Video;

function Seeker({ video }) {
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Update the document title using the browser API
    if (video) {
      // setDuration(mediaRef.current.duration);
      video.addEventListener('timeupdate', handleTimeUpdated);
    }
    return function cleanup() {
      if (video) {
        // removeEventListener
        video.removeEventListener('timeupdate', handleTimeUpdated);
      }
    };
  }, [video]);

  function handleTimeUpdated(e) {
    let currentTime = e.target.currentTime;
    let duration = e.target.duration;
    setTime(currentTime);
    setDuration(duration);

    setProgress((currentTime / duration) * 100);
  }

  function handleThumbSlide(progress) {
    if (video) {
      // setProgress(progress);
      video.currentTime = (progress * video.duration) / 100;
    }
  }

  const debouncedHandleThumbSlide = useDebouncedCallback(
    value => handleThumbSlide(value),
    200
  );

  return (
    <Flex p="1" pr="2" bg="white">
      <Text
        css={{
          fontSize: '0.9em',
          fontWeight: 500,
          color: '#929292',
          cursor: 'pointer',
        }}
        px="1"
      >
        {getTimeStamp(time)}
      </Text>
      <Slider
        aria-label="slider-ex-1"
        value={progress}
        focusThumbOnChange={false}
        onChange={progress => setProgress(progress)}
        // onChangeStart={() => video.pause()}
        onChangeEnd={debouncedHandleThumbSlide}
        ml="2"
      >
        <SliderTrack bg="gray.400">
          <SliderFilledTrack bg="teal.500" />
        </SliderTrack>
        <SliderThumb bg="teal.500" />
      </Slider>
      <Text
        css={{
          fontSize: '0.9em',
          fontWeight: 500,
          color: '#929292',
          cursor: 'pointer',
        }}
        px="1"
      >
        {getTimeStamp(duration)}
      </Text>
    </Flex>
  );
}
