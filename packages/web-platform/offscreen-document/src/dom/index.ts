export function createOffscreenDocument(
  element: HTMLElement,
): OffscreenDocumentToken {
  const shadowRoot = element.shadowRoot
    ?? element.attachShadow({ mode: 'open' });
  const messageChannel = new MessageChannel();
  const { port1, port2 } = messageChannel;
  const uniqueIdToElement: WeakRef<Element>[] = [];
  port1.onmessage = (ev: MessageEvent<>) => {
  };
}
