"use client"

import * as React from "react"
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"
import { ArrowLeftIcon, ArrowRightIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CarouselContextProps = {
  embla: UseEmblaCarouselType[0]
  api: UseEmblaCarouselType[1]
  scrollNext: () => void
  scrollPrev: () => void
  canScrollNext: boolean
  canScrollPrev: boolean
} & React.ComponentPropsWithoutRef<"div">

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

type CarouselProps = {
  opts?: React.ComponentProps<typeof useEmblaCarousel>[0]
  plugins?: React.ComponentProps<typeof useEmblaCarousel>[1]
  orientation?: "horizontal" | "vertical"
} & React.ComponentPropsWithoutRef<"div">

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ opts, plugins, orientation = "horizontal", className, children, ...props }, ref) => {
    const [emblaRef, emblaApi] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins,
    )
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)

    const onSelect = React.useCallback((emblaApi: any) => {
      setCanScrollPrev(emblaApi.canScrollPrev())
      setCanScrollNext(emblaApi.canScrollNext())
    }, [])

    const scrollPrev = React.useCallback(() => {
      emblaApi?.scrollPrev()
    }, [emblaApi])

    const scrollNext = React.useCallback(() => {
      emblaApi?.scrollNext()
    }, [emblaApi])

    React.useEffect(() => {
      if (!emblaApi) {
        return
      }

      onSelect(emblaApi)
      emblaApi.on("reInit", onSelect)
      emblaApi.on("select", onSelect)
    }, [emblaApi, onSelect])

    return (
      <CarouselContext.Provider
        value={{
          embla: emblaRef,
          api: emblaApi,
          scrollNext,
          scrollPrev,
          canScrollNext,
          canScrollPrev,
          orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        }}
      >
        <div ref={ref} className={cn("relative", className)} role="region" aria-roledescription="carousel" {...props}>
          {children}
        </div>
      </CarouselContext.Provider>
    )
  },
)
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { embla, orientation } = useCarousel()

    return (
      <div ref={embla} className="overflow-hidden">
        <div className={cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)} {...props} />
      </div>
    )
  },
)
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { orientation } = useCarousel()

    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={cn("min-w-0 shrink-0 grow-0 basis-full", orientation === "horizontal" ? "pl-4" : "pt-4", className)}
        {...props}
      />
    )
  },
)
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { scrollPrev, canScrollPrev } = useCarousel()

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("absolute h-8 w-8 rounded-full", "left-4 top-1/2 -translate-y-1/2", className)}
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        {...props}
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="sr-only">Previous slide</span>
      </Button>
    )
  },
)
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { scrollNext, canScrollNext } = useCarousel()

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("absolute h-8 w-8 rounded-full", "right-4 top-1/2 -translate-y-1/2", className)}
        onClick={scrollNext}
        disabled={!canScrollNext}
        {...props}
      >
        <ArrowRightIcon className="h-4 w-4" />
        <span className="sr-only">Next slide</span>
      </Button>
    )
  },
)
CarouselNext.displayName = "CarouselNext"

export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, useCarousel }
