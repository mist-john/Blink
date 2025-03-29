import Link from "next/link";

const footerNavs = [
  {
    label: "Community",
    items: [
      {
        href: "/",
        name: "Twitter",
      },
    ],
  },
];

const footerSocials = [
  {
    href: "",
    name: "Twitter",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 16 16"
      >
        <path
          fill="currentColor"
          d="M9.294 6.928L14.357 1h-1.2L8.762 6.147L5.25 1H1.2l5.31 7.784L1.2 15h1.2l4.642-5.436L10.751 15h4.05zM7.651 8.852l-.538-.775L2.832 1.91h1.843l3.454 4.977l.538.775l4.491 6.47h-1.843z"
        />
      </svg>
    ),
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-transparent">
      <div className="mx-auto w-full max-w-screen-xl xl:pb-2">
        <div className="md:flex md:justify-between px-8 p-4 py-16 sm:pb-16 gap-4">
          <div className="mb-12 flex-col flex gap-4">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo-blink.png"
                className="h-8 w-8 text-primary bg-white rounded-full"
              />
              <span className="self-center text-2xl font-semibold whitespace-nowrap text-white">
                Funblinks
              </span>
            </Link>
            <p className="max-w-xs text-gray-400">
              Blink your token for a few seconds
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:gap-10 sm:grid-cols-3">
            {footerNavs.map((nav) => (
              <div key={nav.label}>
                <h2 className="mb-6 text-sm tracking-tighter font-medium text-white uppercase">
                  {nav.label}
                </h2>
                <ul className="gap-2 grid">
                  {nav.items.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="cursor-pointer text-gray-400 hover:text-gray-200 duration-200 font-[450] text-sm"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex sm:items-center sm:justify-between rounded-md py-4 px-8 gap-2">
          <div className="flex space-x-5 sm:justify-center sm:mt-0">
            {footerSocials.map((social) => (
              <Link
                key={social.name}
                href={social.href}
                className="text-gray-500 hover:text-gray-300 fill-gray-500 hover:fill-gray-300"
              >
                {social.icon}
                <span className="sr-only">{social.name}</span>
              </Link>
            ))}
          </div>
          <span className="text-sm text-gray-400 sm:text-center">
            Copyright © {new Date().getFullYear()}{" "}
            <Link href="/" className="cursor-pointer hover:text-gray-300">
              Funblinks
            </Link>
            . All Rights Reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
