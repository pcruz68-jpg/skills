# Motion Lab

Este projeto é um catálogo executável de animações e efeitos para interfaces HTML-first.

## Arquitetura

- `index.html` é a página inicial e reúne animações de entrada.
- `component-motion.html` reúne experimentos de movimento aplicados a componentes, incluindo Cloth flag, Glass shimmer CTA, Valence Core, Border Glow e Option Wheel.
- `live-backgrounds.html` reúne Liquid shader, Blaze, Droplets e Frost do Canvas UI; Matrix, Aura laser, Gradient field e Masked Matrix do Unicorn Studio; Glass wave do Spline; e Aurora, Floating Lines e Light Pillar do React Bits.
- `spatial-3d.html` é dedicada ao Glass Object do Canvas UI.
- A navbar principal é um painel horizontal flutuante no topo, separado das bordas da viewport, e liga os quatro tipos de animação.
- As páginas não possuem sidebar; a área abaixo da navbar pertence integralmente ao catálogo.
- Não crie uma página de overview ou uma hero introdutória; o catálogo começa diretamente nos cards de Entrances.

## Regras

- Use HTML, CSS e JavaScript puro; não introduza frameworks ou etapa de build.
- Componentes importados do Canvas UI devem usar a variante vanilla como código local. Preserve a referência de origem no arquivo e ofereça um fallback visual quando `html-in-canvas` não estiver disponível.
- Prefira CSS, depois Web Animations API ou Canvas. Use WebGL/Three.js somente quando o efeito precisar deles.
- Cada demo deve ter uma função `mount` e devolver ou expor seu cleanup quando criar listeners, timers, animation frames ou recursos gráficos.
- Pause animações pesadas fora do viewport e quando a página estiver oculta.
- Respeite `prefers-reduced-motion` e ofereça uma apresentação estática equivalente.
- Preserve dimensões estáveis, legibilidade e interação do conteúdo sobre os efeitos.
- Mantenha somente a navbar flutuante no topo das páginas.
- Mantenha a estrutura dos cards consistente entre todas as páginas.
- Cada card deve mostrar apenas o nome e o efeito executável. Inclua somente os controles necessários para experimentar, pausar ou reiniciar o efeito.
- Cada Entrance deve expor sliders compactos para duração e para a propriedade visual mais relevante do efeito; mudanças devem atualizar o valor visível e repetir a animação.
- O Particle Scroll pertence a Entrances: use a implementação vanilla local do Canvas UI numa mini viewport rolável, exponha seus parâmetros oficiais e preserve um fallback HTML navegável.
- O Cloth flag deve expor sliders para todos os parâmetros numéricos do motor. `pin` permanece em `top` para corresponder à haste horizontal e `backing` pertence à arte da bandeira.
- O Glass shimmer CTA adapta o componente público Aura `219AF`: preserve o beam cônico giratório, a superfície glassmorphism, o orbe, o hover luminoso e a resposta ao clique usando somente CSS e JavaScript local.
- O Valence Core adapta o componente público Aura `8AD90`: preserve o shader WebGL dos arcos elétricos, a entrada em glitches e os estados de hover e clique; use Web Animations API no lugar do GSAP e mantenha um fallback elétrico em CSS.
- O Border Glow deve preservar a detecção de proximidade das bordas, o ângulo do cursor, as máscaras cônicas, a malha de gradientes e o sweep opcional do React Bits; implemente tudo em CSS e JavaScript puro e respeite movimento reduzido.
- O React Bits Option Wheel deve preservar o arco circular, a suavização exponencial independente do frame rate, o snap, wheel/touchpad, arraste, clique, teclado, loop, side, blur e fade por distância; implemente em CSS e JavaScript puro, com semântica de listbox.
- O Blaze deve usar a implementação vanilla local do Canvas UI, expor todos os parâmetros numéricos e manter um fallback em CSS quando WebGL2 não estiver disponível.
- O Droplets deve usar a implementação vanilla local do Canvas UI sobre uma fonte Canvas2D pré-pintada, preservar a interação de limpar o vidro e manter um fallback em CSS quando WebGL2 não estiver disponível.
- O Frost deve usar a implementação vanilla local do Canvas UI sobre uma fonte Canvas2D pré-pintada, preservar a interação de derreter e recongelar o gelo e manter um fallback em CSS quando WebGL2 não estiver disponível.
- O Matrix adapta o componente público Aura `C57A1CA`: carregue o projeto original `1bY8o6HVTI1oxJxuCJEG` pelo SDK do Unicorn Studio, isole seu ciclo de vida, exponha parâmetros de render e aparência, e mantenha o degradê atmosférico em CSS como fallback.
- O Aura laser adapta o componente público Aura `D92CFE3`: carregue o projeto original `ZHhDKfVqqu8PKOSMwfuA` pelo controlador compartilhado do Unicorn Studio e preserve seu halo quente em CSS como fallback.
- O Gradient field adapta o componente público Aura `83B363C`: carregue o projeto original `BhoqrigscYbD7NN1fwcp` pelo controlador compartilhado do Unicorn Studio e preserve sua base azul e roxa em CSS como fallback.
- O Masked Matrix adapta o componente público Aura `8E9C3`: carregue o projeto original `XxCmD31vVBmiINgvYCho`, preserve a máscara inferior e permita editar seu ponto inicial sem alterar a cena original.
- O Glass wave adapta o componente público Aura `A69878E`: carregue a cena original do Spline em iframe somente perto da viewport, descarregue-a ao pausar ou afastar o card e preserve uma onda azul em CSS como fallback.
- O React Bits Aurora deve preservar o fragment shader, simplex noise, rampa de três cores e parâmetros oficiais do componente; implemente o triângulo de tela cheia diretamente em WebGL2, sem React nem OGL no runtime, e mantenha um fallback em CSS.
- O React Bits Floating Lines deve preservar as três famílias de linhas, posições e rotações de onda, curvatura interativa, damping e parallax do fragment shader; renderize diretamente em WebGL2, sem React nem Three.js no runtime.
- O React Bits Light Pillar deve preservar o raymarching, o campo de distância, as deformações em ondas, o gradiente vertical, o brilho, o ruído, as três qualidades e a rotação interativa do shader; renderize diretamente em WebGL2, sem React nem Three.js no runtime.
- O Glass Object deve usar a implementação vanilla local do Canvas UI com assets locais para a forma e o backdrop, controles persistentes para suas propriedades principais e fallback em CSS quando WebGL não estiver disponível.
- Todo efeito de Entrances, Component Motion e Live Backgrounds deve manter seus sliders dentro de um `details.parameter-panel` recolhido por padrão.
- O botão `Parameters` deve aparecer no cabeçalho de todos os cards e se deslocar conforme existam zero, uma ou duas ações ao lado; ao abrir, os controles continuam abaixo do palco do efeito.
- Persista cada mudança de slider com `js/settings.js`. O helper armazena um único objeto JSON no `localStorage`; hidrate os controles e a configuração do renderizador antes de iniciar cada efeito.
- Use três colunas de cards em telas largas, duas em larguras intermediárias e uma no mobile. Entrances e Component Motion devem preservar demos mais baixas e compactas.

## Categorias

- **Entrances:** animações finitas disparadas por carregamento ou entrada no viewport.
- **Component Motion:** movimento idle contínuo e respostas a ações do usuário.
- **Live Backgrounds:** atmosferas de layout feitas com CSS, Canvas, partículas ou shaders.
- **Spatial & 3D:** profundidade, perspectiva, geometria, modelos e cenas interativas.
