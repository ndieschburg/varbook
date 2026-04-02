/**
 * Type extensions for epub.js and Web APIs
 *
 * @description Fixes incomplete types from @types/epubjs and adds
 * missing Web API types (Screen Orientation Lock API)
 */

// Screen Orientation Lock API - not in default DOM types
interface ScreenOrientation {
    lock(orientation: OrientationLockType): Promise<void>;
    unlock(): void;
}

type OrientationLockType =
    | 'any'
    | 'natural'
    | 'landscape'
    | 'portrait'
    | 'portrait-primary'
    | 'portrait-secondary'
    | 'landscape-primary'
    | 'landscape-secondary';

// epub.js type extensions
declare module 'epubjs' {
    // Re-export types that exist but aren't properly exported
    export interface Book {
        spine: Spine;
        locations: Locations;
        navigation: Navigation;
        loaded: {
            spine: Promise<Spine>;
            navigation: Promise<Navigation>;
            metadata: Promise<PackagingMetadataObject>;
        };
        ready: Promise<void>;
        load(url: string | ArrayBuffer): Promise<Book>;
        renderTo(element: Element | string, options?: RenditionOptions): Rendition;
        destroy(): void;
    }

    export interface NavItem {
        id: string;
        href: string;
        label: string;
        subitems?: NavItem[];
        parent?: string;
    }

    export interface Navigation {
        toc: NavItem[];
        landmarks: NavItem[];
        length: number;
        get(target: string): NavItem;
        forEach(callback: (item: NavItem) => void): void;
    }

    export interface PackagingMetadataObject {
        title: string;
        creator: string;
        description: string;
        pubdate: string;
        publisher: string;
        identifier: string;
        language: string;
        rights: string;
        modified_date: string;
        layout: string;
        orientation: string;
        flow: string;
        viewport: string;
        spread: string;
    }

    export interface RenditionOptions {
        width?: number | string;
        height?: number | string;
        ignoreClass?: string;
        manager?: string;
        view?: string;
        flow?: string;
        layout?: string;
        spread?: string;
        minSpreadWidth?: number;
        stylesheet?: string;
        resizeOnOrientationChange?: boolean;
        script?: string;
        allowScriptedContent?: boolean;
    }

    export interface Location {
        cfi: string;
        href: string;
        percentage: number;
        index: number;
        displayed: {
            page: number;
            total: number;
        };
    }

    export interface DisplayedLocation {
        start: Location;
        end: Location;
        atStart: boolean;
        atEnd: boolean;
    }

    export interface SpineItem {
        index: number;
        href: string;
        url: string;
        canonical: string;
        cfiBase: string;
        idref: string;
        linear: string;
        properties: string[];
        load(request: Function): Promise<Document>;
        unload(): void;
        cfiFromElement(element: Element): string;
    }

    export interface Spine {
        spineItems: SpineItem[];
        length: number;
        get(target: number | string): SpineItem;
    }

    export interface Locations {
        generate(chars?: number): Promise<string[]>;
        locationFromCfi(cfi: string): number;
        percentageFromCfi(cfi: string): number;
        cfiFromLocation(location: number): string;
        cfiFromPercentage(percentage: number): string;
        length(): number;
    }

    export interface Themes {
        register(name: string, styles: object): void;
        register(styles: object): void;
        select(name: string): void;
        fontSize(size: string): void;
        font(font: string): void;
        override(name: string, value: string, priority?: boolean): void;
        default(styles: object): void;
    }

    export interface Rendition {
        book: Book;
        hooks: {
            content: { register(callback: (contents: Contents) => void): void };
            unloaded: { register(callback: () => void): void };
        };
        themes: Themes;
        display(target?: string | number): Promise<void>;
        next(): Promise<void>;
        prev(): Promise<void>;
        resize(width?: number, height?: number): void;
        on(event: string, callback: (...args: any[]) => void): void;
        off(event: string, callback: (...args: any[]) => void): void;
        once(event: string, callback: (...args: any[]) => void): void;
        destroy(): void;
        currentLocation(): DisplayedLocation;
    }

    export interface Contents {
        document: Document;
        window: Window;
        content: Element;
        sectionIndex: number;
        cfiFromNode(node: Node, offset?: number): string;
        cfiFromRange(range: Range): string;
    }

    // Default export - the ePub function
    function ePub(url: string | ArrayBuffer, options?: object): Book;
    export default ePub;
}
