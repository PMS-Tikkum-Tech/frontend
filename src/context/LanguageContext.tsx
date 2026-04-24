"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { translateText, type LanguageCode } from "@/lib/i18n";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  isReady: boolean;
};

const LANGUAGE_STORAGE_KEY = "kikost-language";
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"] as const;
const textNodeOriginals = new WeakMap<Text, string>();
const elementAttributeOriginals = new WeakMap<Element, Record<string, string>>();

const LanguageContext = createContext<LanguageContextValue | null>(null);

const isValidLanguage = (value: string | null): value is LanguageCode => {
  return value === "id" || value === "en";
};

const shouldSkipElement = (element: Element) => {
  if (element.closest("[data-no-translate='true']")) {
    return true;
  }

  return ["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName);
};

const resolveOriginalText = (node: Text, currentValue: string) => {
  const storedValue = textNodeOriginals.get(node);

  if (storedValue === undefined) {
    textNodeOriginals.set(node, currentValue);
    return currentValue;
  }

  const translatedStoredValue = translateText(storedValue, "en");
  if (
    currentValue !== storedValue &&
    currentValue !== translatedStoredValue
  ) {
    textNodeOriginals.set(node, currentValue);
    return currentValue;
  }

  return storedValue;
};

const getAttributeStore = (element: Element) => {
  const storedAttributes = elementAttributeOriginals.get(element);
  if (storedAttributes) {
    return storedAttributes;
  }

  const nextStore: Record<string, string> = {};
  elementAttributeOriginals.set(element, nextStore);
  return nextStore;
};

const resolveOriginalAttribute = (
  element: Element,
  attributeName: string,
  currentValue: string
) => {
  const attributeStore = getAttributeStore(element);
  const storedValue = attributeStore[attributeName];

  if (storedValue === undefined) {
    attributeStore[attributeName] = currentValue;
    return currentValue;
  }

  const translatedStoredValue = translateText(storedValue, "en");
  if (
    currentValue !== storedValue &&
    currentValue !== translatedStoredValue
  ) {
    attributeStore[attributeName] = currentValue;
    return currentValue;
  }

  return storedValue;
};

const translateTextNode = (node: Text, language: LanguageCode) => {
  const parentElement = node.parentElement;
  const currentValue = node.nodeValue ?? "";

  if (!parentElement || !currentValue.trim() || shouldSkipElement(parentElement)) {
    return;
  }

  const originalValue = resolveOriginalText(node, currentValue);
  const nextValue =
    language === "en" ? translateText(originalValue, "en") : originalValue;

  if (currentValue !== nextValue) {
    node.nodeValue = nextValue;
  }
};

const translateElementAttributes = (element: Element, language: LanguageCode) => {
  if (shouldSkipElement(element)) {
    return;
  }

  for (const attributeName of TRANSLATABLE_ATTRIBUTES) {
    const currentValue = element.getAttribute(attributeName);

    if (!currentValue?.trim()) {
      continue;
    }

    const originalValue = resolveOriginalAttribute(
      element,
      attributeName,
      currentValue
    );
    const nextValue =
      language === "en" ? translateText(originalValue, "en") : originalValue;

    if (currentValue !== nextValue) {
      element.setAttribute(attributeName, nextValue);
    }
  }

  if (
    element instanceof HTMLInputElement &&
    ["button", "submit", "reset"].includes(element.type)
  ) {
    const currentValue = element.value;
    if (!currentValue.trim()) {
      return;
    }

    const originalValue = resolveOriginalAttribute(element, "value", currentValue);
    const nextValue =
      language === "en" ? translateText(originalValue, "en") : originalValue;

    if (currentValue !== nextValue) {
      element.value = nextValue;
      element.setAttribute("value", nextValue);
    }
  }
};

const translateSubtree = (rootNode: Node, language: LanguageCode) => {
  if (rootNode.nodeType === Node.TEXT_NODE) {
    translateTextNode(rootNode as Text, language);
    return;
  }

  if (!(rootNode instanceof Element)) {
    return;
  }

  if (shouldSkipElement(rootNode)) {
    return;
  }

  translateElementAttributes(rootNode, language);

  rootNode.querySelectorAll("*").forEach((element) => {
    translateElementAttributes(element, language);
  });

  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const textNode = node as Text;
        const parentElement = textNode.parentElement;

        if (!parentElement || shouldSkipElement(parentElement)) {
          return NodeFilter.FILTER_REJECT;
        }

        return textNode.nodeValue?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    translateTextNode(currentNode as Text, language);
    currentNode = walker.nextNode();
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [language, setLanguageState] = useState<LanguageCode>("id");
  const [isReady, setIsReady] = useState(false);
  const activeLanguage: LanguageCode =
    pathname?.startsWith("/tenant") ? language : "id";

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (isValidLanguage(storedLanguage)) {
        setLanguageState(storedLanguage);
      }

      setIsReady(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = activeLanguage;
    document.documentElement.dataset.language = activeLanguage;

    if (document.body) {
      translateSubtree(document.body, activeLanguage);
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            translateSubtree(node, activeLanguage);
          });
          continue;
        }

        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text, activeLanguage);
          continue;
        }

        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          translateElementAttributes(mutation.target, activeLanguage);
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES, "value"],
    });

    return () => observer.disconnect();
  }, [activeLanguage, isReady, language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      isReady,
    }),
    [isReady, language]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
};
