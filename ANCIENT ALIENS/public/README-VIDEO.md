Place 'alien.webm' and/or 'alien.mp4' inside this folder to allow the hero to use a modern video player instead of the GIF.

If you don't have a video, the GIF at 'images/20250821_0003_Alien Welcome Message_simple_compose_01k34vjzftf5cv76kxhvdf772g.gif' will be used as a visual fallback.

To generate WebM/MP4 versions from the GIF locally, you can use ffmpeg. Example:

ffmpeg -i "20250821_0003_Alien Welcome Message_simple_compose_01k34vjzftf5cv76kxhvdf772g.gif" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" alien.mp4

ffmpeg -i "20250821_0003_Alien Welcome Message_simple_compose_01k34vjzftf5cv76kxhvdf772g.gif" -c vp9 -b:v 0 -crf 30 alien.webm
