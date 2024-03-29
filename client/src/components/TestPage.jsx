import React, { useEffect, useRef, useState } from 'react';

import { fabric } from 'fabric';
import ere from 'element-resize-event';
import { FiFile } from 'react-icons/fi';
import { useMutation } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Flex,
  Icon,
  Stack,
  Modal,
  Input,
  Button,
  Heading,
  Spinner,
  ModalBody,
  FormLabel,
  InputGroup,
  ModalHeader,
  ModalFooter,
  FormControl,
  ModalOverlay,
  ModalContent,
  useDisclosure,
  InputLeftAddon,
  ModalCloseButton,
} from '@chakra-ui/react';

import Seeker from './Seeker';
import Sidebar from './Sidebar';
import SaveModal from './SaveModal';
import PlayButton from './PlayButton';
import Transcript from './Editor/Transcript';
import { useDebouncedCallback } from '../utils/useDebouncedCallback';
import {
  useVideo,
  useCanvas,
  getSubtitle,
  loadTranscript,
  getVideoDimensions,
} from '../utils';

const OpenSans = {
  variants: ['regular'],
  files: {
    regular:
      'http://fonts.gstatic.com/s/opensans/v20/mem8YaGs126MiZpBA-U1UpcaXcl0Aw.ttf',
  },
  category: 'sans-serif',
  kind: 'webfonts#webfont',
  family: 'Open Sans',
  id: 'open-sans',
};

export const defaultVideoMetaData = {
  canvas: {
    aspect_ratio: '1:1',
    bgColor: '#000000',
    title: false,
    subtitle: true,
  },
  video: {
    url: '',
    quality: '1080p',
  },
  subtitle: {
    fontFamily: 'Open Sans',
    uppercase: false,
    fontSize: 40,
    italic: false,
    fontWeight: 400,
    color: '#000000',
    fontLink: '',
    outlineColor: '#000000',
    outlineWidth: 0,
  },
  title: {
    name: 'Transcript',
    uppercase: false,
    fontSize: 100,
    italic: false,
    fontWeight: 400,
    color: '#000000',
    fontLink: '',
    outlineColor: '#000000',
    outlineWidth: 0,
  },
  images: [],
};
// const shareUrl =
//   'https://app.reduct.video/e/borderer-testing-84e3ce2ba0-f81df100c4861287a746';
const shareUrl =
  'https://app.reduct.video/e/instagram--the-power-of-archiving-69f6b2577d50-7124ecc64b17d4455b66';

const MAX_HEIGHT = 600;
const MAX_WIDTH = 800;

function TestPage({ videoURL, initialValue, projectName }) {
  const { sharePath } = useParams();

  const [shareURL, setShareURL] = useState('');

  const [canvasSize, setCanvasSize] = useState({ height: 1080, width: 1080 });
  const [ar, setAr] = useState('1:1');
  const [wrapperSize, setWrapperSize] = useState({ height: 0, width: 0 });
  const wrapperRef = useRef();
  const [subtitle, setSubtitle] = useState();

  const exportModal = useDisclosure();
  const saveModal = useDisclosure();
  const nameRef = useRef();
  const inputRef = useRef();
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState('');
  const [activeFont, setActiveFont] = useState(OpenSans);

  useEffect(() => {
    if (sharePath) {
      setShareURL(`https://app.reduct.video/e/${sharePath}`);
    }
  }, [sharePath]);

  useEffect(() => {
    if (videoURL) {
      setShareURL(`https://app.reduct.video/e/${videoURL}`);
    }
  }, [videoURL]);

  useEffect(() => {
    if (initialValue) {
      setLayers(prevLayerVal => ({ ...prevLayerVal, ...initialValue }));
    }
  }, [initialValue]);

  const {
    buffering,
    video: vid,
    toggleVideo,
    loading: videoLoading,
  } = useVideo(shareURL);

  const { canvasRef, canvas } = useCanvas(canvasSize);

  const [layers, setLayers] = useState({ ...defaultVideoMetaData });

  useEffect(() => {
    if (vid && subtitle) {
      bootstrapElements();
    }
  }, [vid, subtitle]);

  useEffect(() => {
    if (vid && !videoLoading) {
      let { left, top, width, height } = getVideoDimensions(
        canvasSize.width,
        canvasSize.height,
        vid.videoWidth,
        vid.videoHeight
      );

      const videoElement = new fabric.Image(vid, {
        left,
        top,
        name: 'video',
      });
      videoElement.scaleToHeight(height);
      videoElement.scaleToWidth(width);
      canvas.add(videoElement);
      canvas.sendToBack(videoElement);
    }
  }, [videoLoading, vid]);

  function bootstrapElements() {
    const myText = new fabric.Textbox('', {
      originX: 'center',
      originY: 'center',
      left: 0.5 * canvasSize.width,
      top: 0.9 * canvasSize.height,
      width: 400,
      textAlign: 'center',
      editable: false,
      name: 'subtitle',
      fontSize: layers.subtitle.fontSize,
      fontWeight: layers.subtitle.fontWeight,
    });

    myText.setControlsVisibility({ mt: false, mb: false });
    canvas.add(myText);
    return { myText };
  }

  function getFontLink() {
    if (activeFont.id === 'open-sans') {
      return OpenSans.files.regular;
    } else {
      if (
        activeFont.files[
          layers.subtitle.fontWeight + (layers.subtitle.italic ? 'italic' : '')
        ]
      ) {
        return activeFont.files[
          layers.subtitle.fontWeight + (layers.subtitle.italic ? 'italic' : '')
        ];
      } else {
        return activeFont.files.regular;
      }
    }
  }

  function handleTitleToggle(showTitle) {
    if (showTitle) {
      const title = new fabric.Textbox(layers.title.name, {
        originX: 'center',
        originY: 'center',
        left: 0.5 * canvasSize.width,
        top: 0.1 * canvasSize.height,
        width: 400,
        textAlign: 'center',
        editable: false,
        name: 'title',
        fontSize: layers.title.fontSize,
        fill: layers.title.color,
        fontFamily: activeFont.family,
      });
      canvas.add(title);
    } else {
      const title = canvas.getItemByName('title');
      canvas.remove(title);
    }
    setLayers(layers => ({
      ...layers,
      canvas: { ...layers.canvas, title: !layers.canvas.title },
    }));
  }

  function draw() {
    if (layers.canvas.bgColor && canvas) {
      canvas.set('backgroundColor', layers.canvas.bgColor);
    }
    if (canvas) {
      let myText = canvas.getItemByName('subtitle');
      if (subtitle) {
        subtitle.forEach(s => {
          if (s.start < vid.currentTime && s.end > vid.currentTime) {
            myText.set('text', s.text);
            myText.set('fontFamily', activeFont.family);
          }
        });
      }
      canvas.renderAll();
    }
  }

  useEffect(() => {
    const wrapper = wrapperRef.current;

    setWrapperSize({
      width: wrapper.offsetWidth,
      height: wrapper.offsetHeight,
    });

    ere(wrapper, () => {
      setWrapperSize({
        width: wrapper.offsetWidth,
        height: wrapper.offsetHeight,
      });
    });

    // if (aspectRatio) handleDimensionsChange(aspectRatio);
  }, []);

  useEffect(() => {
    loadTranscript(shareURL).then(transcript => {
      let subtitle = getSubtitle(transcript);
      setSubtitle(subtitle);
    });
  }, [shareURL]);

  const handleSubtitleEdit = useDebouncedCallback(
    subtitle => setSubtitle(subtitle),
    400
  );

  function handleDimensionsChange(ar) {
    let height, width;
    setAr(ar);

    switch (ar) {
      case '1:1':
        width = 1080;
        height = 1080;
        break;
      case '16:9':
        width = 1920;
        height = 1080;
        break;
      case '9:16':
        width = 1080;
        height = 1920;
        break;
      case '4:5':
        width = 1080;
        height = 1350;
        break;
      default:
        height = canvasSize.height;
        width = canvasSize.width;
    }

    // vid;

    setCanvasSize({ height, width });
    let videoElement = canvas.getItemByName('video');
    let subtitleElement = canvas.getItemByName('subtitle');
    let {
      left,
      top,
      width: w,
      height: h,
    } = getVideoDimensions(width, height, vid.videoWidth, vid.videoHeight);

    videoElement.set({
      left,
      top,
    });

    subtitleElement.set({
      left: 0.5 * width,
      top: 0.9 * height,
    });

    videoElement.scaleToHeight(h);
    videoElement.scaleToWidth(w);
    canvas.setDimensions({ height, width });
    canvas.renderAll();
  }

  const removeImage = name => {
    let image = canvas.getItemByName(name);
    canvas.remove(image);
    setLayers({
      ...layers,
      images: layers.images.filter(i => i.name !== name),
    });
  };

  function handleFileUpload(e) {
    let file = e.target.files[0];
    let reader = new FileReader();
    reader.onload = function (readerEvent) {
      let image = new Image();
      image.src = readerEvent.target.result;
      image.onload = function () {
        let img = new fabric.Image(image, {
          name: file.name.split('.').join(Date.now() + '.'),
          displayName: file.name,
          file: file,
        });

        img.set({
          left: 100,
          top: 60,
        });
        img.scaleToWidth(200);
        canvas.add(img).setActiveObject(img).renderAll();
        setLayers({ ...layers, images: [...layers.images, img] });
      };
    };
    reader.readAsDataURL(file);
  }

  function getCoords(name) {
    let item = canvas.getItemByName(name);
    if (!item) return null;
    return item.getBoundingRect();
  }

  function getIndex(name) {
    const items = canvas.getObjects().map(i => i.name);

    return items.indexOf(name);
  }

  function onSubmit(e) {
    e.preventDefault();
    let body = {
      name: nameRef.current.value,
      src: inputRef.current.value,
      canvas: {
        ...layers.canvas,
        height: canvasSize.height,
        width: canvasSize.width,
      },
      layers: {},
    };

    if (body.canvas.title) {
      body.layers.title = {
        index: getIndex('title'),
        type: 'title',
        ...layers.title,
        ...getCoords('title'),
        fontLink: getFontLink(),
        fontFamily: activeFont.family,
      };
    }
    body.layers.subtitle = {
      index: getIndex('subtitle'),
      type: 'subtitle',
      subtitles: subtitle,
      ...layers.subtitle,
      ...getCoords('subtitle'),
      fontLink: getFontLink(),
    };
    body.layers.video = {
      index: getIndex('video'),
      type: 'video',
      ...layers.video,
      ...getCoords('video'),
    };

    layers.images.forEach(image => {
      body.layers[image.name] = {
        index: getIndex(image.name),
        name: image.name,
        type: 'image',
        ...getCoords(image.name),
      };
    });

    let formData = new FormData();
    formData.append('body', JSON.stringify(body));
    formData.append('input.mp4', inputRef.current.files[0]);
    layers.images.forEach(element => {
      formData.append(element.name, element.file);
    });
    exportProjectMutation.mutate(formData);

    navigate('/reels');
  }

  const exportProjectMutation = useMutation(async function (formData) {
    await fetch('/borderer/generate_reel', {
      method: 'POST',
      body: formData,
    });
  });

  const saveProjectMutation = useMutation(async function ({
    projectName,
    body,
  }) {
    await fetch('/borderer/projects/', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ project_name: projectName, layers: body }),
    })
      .then(res => res.json())
      .then(res => navigate('/project/' + res.id));
  });

  function saveProject(projectName) {
    let images = [];
    if (layers.images.length) {
      images = layers.images.map(image => {
        const { name } = image;
        return {
          name,
          type: 'image',
          index: getIndex(name),
          ...getCoords(name),
        };
      });
    }

    const body = {
      ...layers,
      title: {
        index: getIndex('title'),
        type: 'title',
        ...layers.title,
        ...getCoords('title'),
        fontLink: getFontLink(),
        fontFamily: activeFont.family,
      },
      subtitle: {
        index: getIndex('subtitle'),
        type: 'subtitle',
        subtitles: subtitle,
        ...layers.subtitle,
        ...getCoords('subtitle'),
        fontLink: getFontLink(),
      },
      images,
      video: {
        index: getIndex('video'),
        type: 'video',
        ...layers.video,
        ...getCoords('video'),
        url: shareURL,
      },
    };

    saveProjectMutation.mutate({
      projectName,
      body,
    });
  }

  let scale;
  if (canvasSize.width > canvasSize.height) {
    scale = wrapperSize.width / canvasSize.width;
    scale = Math.min(scale, MAX_WIDTH / canvasSize.width);
  } else {
    scale = wrapperSize.height / canvasSize.height;
    scale = Math.min(scale, MAX_HEIGHT / canvasSize.height);
  }

  const containerHeight = scale * canvasSize.height;
  const containerWidth = scale * canvasSize.width;

  const closeExportModal = () => {
    exportModal.onClose();
    setSelectedVideo('');
  };

  const exportVideoModal = () => {
    return (
      <Modal isOpen={exportModal.isOpen} onClose={closeExportModal}>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={onSubmit}>
            <ModalHeader>Export Video</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Stack>
                <FormControl id="name" isRequired>
                  <FormLabel>Enter File Name</FormLabel>
                  <Input ref={nameRef} placeholder="Enter file name" />
                </FormControl>
                <FormControl id="video" isRequired>
                  <FormLabel>Upload Video</FormLabel>
                  <InputGroup>
                    <InputLeftAddon
                      children={<Icon as={FiFile} />}
                      color="teal"
                      onClick={() => inputRef.current.click()}
                    />
                    <input
                      type="file"
                      accept="video/mp4"
                      placeholder="Upload File"
                      ref={inputRef}
                      onChange={e => setSelectedVideo(e.target.files[0].name)}
                      style={{ display: 'none' }}
                    ></input>
                    <Input
                      placeholder="Upload Video"
                      value={selectedVideo}
                      onClick={() => inputRef.current.click()}
                    />
                  </InputGroup>
                </FormControl>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button
                type="submit"
                colorScheme={'teal'}
                mr={3}
                isLoading={exportProjectMutation.isLoading}
              >
                Export
              </Button>
              <Button variant="ghost" onClick={closeExportModal}>
                Close
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    );
  };

  const saveVideoModal = () => {
    return (
      <SaveModal
        isOpen={saveModal.isOpen}
        onClose={saveModal.onClose}
        onSubmit={saveProject}
        loading={saveProjectMutation.isLoading}
      />
    );
  };

  function padStart(num) {
    return String(Math.floor(num)).padStart(2, '0');
  }

  function getSRTTimestamp(time) {
    let hour = time / 3600;
    time %= 3600;
    let minutes = time / 60;
    time %= 60;
    let seconds = Math.floor(time);
    let milliseconds = (time % 1) * 100;
    return `${padStart(hour)}:${padStart(minutes)}:${padStart(
      seconds
    )},${padStart(milliseconds)}`;
  }

  function getSRT() {
    let srtText = subtitle.reduce((acc, curr, index) => {
      acc += `${index + 1}\n${getSRTTimestamp(
        curr.start
      )} --> ${getSRTTimestamp(curr.end)}\n${curr.text}\n\n`;
      return acc;
    }, '');

    let element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(srtText)
    );
    element.setAttribute('download', layers.title.name + '.srt');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  const Navbar = ({ projectName }) => {
    return (
      <Flex
        px="6"
        color="white"
        bg="teal.500"
        h="65px"
        alignItems={'center'}
        justifyContent="space-between"
      >
        Navbar
        <Flex>
          <Stack direction="row">
            <Button colorScheme="teal" onClick={saveModal.onOpen}>
              {projectName ?? 'Save Project'}
            </Button>
            <Button colorScheme="teal" onClick={getSRT}>
              Download SRT
            </Button>
            <Button colorScheme="teal" onClick={exportModal.onOpen}>
              Export Video
            </Button>
          </Stack>
        </Flex>
      </Flex>
    );
  };

  return (
    <>
      <Flex direction={'column'} height="100%">
        <Navbar projectName={projectName} />
        <Flex direction="row" height="100%" flexGrow={1} overflow={'hidden'}>
          <LeftSidebar
            vid={vid}
            canvas={canvas}
            subtitle={subtitle}
            setLayers={setLayers}
            title={layers.title.name}
            handleSubtitleEdit={handleSubtitleEdit}
          />
          <Flex
            pt="4"
            px="4"
            flex="2"
            h="100%"
            w="100%"
            id="red"
            bg="gray.100"
            margin="0 auto"
            ref={wrapperRef}
            flexDirection="column"
            justifyContent="flex-start"
          >
            <Box
              py="2"
              flexGrow="1"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box
                style={{
                  maxWidth: '100%',
                  margin: '0 auto',
                  overflow: 'hidden',
                  width: containerWidth + 'px',
                  height: containerHeight + 'px',
                }}
              >
                <Box
                  style={{
                    width: canvasSize.width,
                    transformOrigin: '0 0 0',
                    height: canvasSize.height,
                    transform: 'scale(' + scale + ')',
                  }}
                >
                  <Box
                    position="relative"
                    w={canvasSize.width}
                    h={canvasSize.height}
                  >
                    <Flex position="relative">
                      <Flex
                        h="100%"
                        w="100%"
                        zIndex="1"
                        id="spinner"
                        alignItems="center"
                        position="absolute"
                        bg="rgba(0,0,0,0.2)"
                        justifyContent="center"
                        hidden={!(buffering || videoLoading)}
                      >
                        <Spinner color="teal" size="xl" thickness="8px" />
                      </Flex>
                      <Canvas draw={draw} ref={canvasRef} />
                    </Flex>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Flex justifyContent="center" alignItems="center" flexGrow="1">
              <PlayButton
                vid={vid}
                buffering={buffering}
                toggleVideo={toggleVideo}
              />
            </Flex>
            <Seeker video={vid} />
          </Flex>
          <Sidebar
            ar={ar}
            canvas={canvas}
            layers={layers}
            setLayers={setLayers}
            removeImage={removeImage}
            setActiveFont={setActiveFont}
            isImage={layers.images.length}
            handleFileUpload={handleFileUpload}
            handleTitleToggle={handleTitleToggle}
            handleDimensionsChange={handleDimensionsChange}
          />
        </Flex>
      </Flex>
      {exportVideoModal()}
      {saveVideoModal()}
    </>
  );
}

const Canvas = React.forwardRef((props, canvasRef) => {
  const { draw, ...rest } = props;

  useEffect(() => {
    let frameCount = 0;
    let animationFrameId;

    const render = () => {
      frameCount++;
      draw(frameCount);
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [draw]);

  return <canvas ref={canvasRef} {...rest} id="my-canvas" />;
});

export default TestPage;

const LeftSidebar = ({
  vid,
  title,
  canvas,
  subtitle,
  setLayers,
  handleSubtitleEdit,
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.innerText = title;
  }, []);

  const onTitleChange = event => {
    setLayers(prevLayerVal => ({
      ...prevLayerVal,
      title: { ...prevLayerVal.title, name: event.target.innerText },
    }));
    const newTitle = canvas.getItemByName('title');
    if (newTitle) {
      newTitle.text = event.target.innerText;
      canvas.renderAll();
    }
  };

  return (
    <Flex
      w="400px"
      direction="column"
      overflowY="scroll"
      borderRight="1px solid #edf2f7"
    >
      <Heading px={4} className="apply-font" my="6">
        <div ref={inputRef} contentEditable onInput={onTitleChange} />
      </Heading>
      {subtitle && (
        <Transcript
          video={vid}
          subtitle={subtitle}
          onEdit={edit => handleSubtitleEdit(edit)}
        />
      )}
    </Flex>
  );
};
