// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  // strictImportMetaEnv: unknown
}
interface ImportMetaEnv {
  readonly VITE_USER_CLIENT_STRIPE_PUBLISHABLE_KEY: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
