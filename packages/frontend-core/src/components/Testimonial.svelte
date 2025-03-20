<script>
  import { Layout } from "@budibase/bbui"
  
  import TheMoscowKremlin from "../../assets/russia/The_Moscow_Kremlind.jpg"
  import RedSquareandStBasilsCathedralMoscow from "../../assets/russia/Red_Square_and_St_Basils_Cathedral_Moscow.jpg"
  import ChristtheSaviorCathedral from "../../assets/russia/Christ_the_Savior_Cathedral.jpg"
  import LuzhnikiStadiumMoscow from "../../assets/russia/Luzhniki_Stadium_Moscow.jpg"
  import StalinsSevenSistersskyscrapersMoscow from "../../assets/russia/Stalin_s_Seven_Sisters_skyscrapers_Moscow.jpg"
  import Peterhof_near_St_Petersburg from "../../assets/russia/Peterhof_near_St_Petersburg.jpg"
  import The_Winter_Palace_St_Petersburg from "../../assets/russia/The_Winter_Palace_St_Petersburg.jpg"
  import The_Aurora_cruiser_St_Petersburg from "../../assets/russia/The_Aurora_cruiser_St_Petersburg.jpg"
  import The_Bronze_Horseman_monument_St_Petersburg from "../../assets/russia/The_Bronze_Horseman_monument_St_Petersburg.jpg"
  import Rising_drawbridges_St_Petersburg from "../../assets/russia/Rising_drawbridges_St_Petersburg.jpg"
  import Kant_Island_Kaliningrad from "../../assets/russia/Kant_Island_Kaliningrad.jpg"
  import The_Motherland_is_Calling_monument_Volgograd from "../../assets/russia/The_Motherland_is_Calling_monument_Volgograd.jpg"
  import The_Kul_Sharif_Mosque_Kazan from "../../assets/russia/The_Kul_Sharif_Mosque_Kazan.jpg"
  import Olympic_Park_in_Sochi_Krasnodar_Territory from "../../assets/russia/Olympic_Park_in_Sochi_Krasnodar_Territory.jpg"
  import Lake_Baikal_Siberia from "../../assets/russia/Lake_Baikal_Siberia.jpg"
  import Tokarev_Lighthouse_Vladivostok from "../../assets/russia/Tokarev_Lighthouse_Vladivostok.jpg"
  import Kamchatka_volcanoes from "../../assets/russia/Kamchatka_volcanoes.jpg"
  import Rzhev_memorial_Tver_Region from "../../assets/russia/Rzhev_memorial_Tver_Region.jpg"
  import The_Swallow_Nest_Crimea from "../../assets/russia/The_Swallow_Nest_Crimea.jpg"
  import Crimea_Bridge from "../../assets/russia/Crimea_Bridge.jpg"

  const testimonials = [
    {
      text: "This is the very heart of Moscow with a rich history, housing the tsars’ residences for centuries (before Peter the Great moved it to St. Petersburg). The most remarkable things to see inside the Kremlin are the Tsar Cannon, Tsar Bell, beautiful cathedrals where the tsars were crowned and later buried - and the Soviet era Kremlin Palace (former Palace of Congresses).",
      name: "The Moscow Kremlin",
      role: "Developer from Russia",
      image: TheMoscowKremlin,
      imageSize: 300,
    },
    {
      text: "Red Square, which is next to the Kremlin, is probably the most recognisable place in Russia for people around the world, especially St. Basil’s Cathedral and Lenin's Mausoleum. ‘Red’ meant ‘beautiful’ in the old Russian language, so this name says more than words.",
      name: "Red Square and St. Basil’s Cathedral, Moscow",
      role: "Developer from Russia",
      image: RedSquareandStBasilsCathedralMoscow,
      imageSize: 300,
    },
    {
      text: "This church has a very tragic fate and symbolises all of Russian history in the 20th century. Built in the mid 19th century in the Byzantine style, it was demolished by the Soviet authorities in 1931. A swimming pool was built on this location, but in the 1990s the cathedral was rebuilt, and today it’s the main house of worship of the Russian Orthodox Church. ",
      name: "Christ the Savior Cathedral",
      role: "Developer from Russia",
      image: ChristtheSaviorCathedral,
      imageSize: 300,
    },
    {
      text: "This was the main venue of the legendary Summer Olympic Games in 1980, and many remember how the Olympic mascot, Mishka the bear, flew away into the sky above the stadium. Russians are nostalgic for The Games, as it was marked by unforgettable festivities, and because for the first time they saw foreigners. ",
      name: "Luzhniki Stadium, Moscow",
      role: "Developer from Russia",
      image: LuzhnikiStadiumMoscow,
      imageSize: 300,
    },
    {
      text: "The rare Muscovite will be able to tell which one houses which institution from the first try; but without a doubt, they know the one that is home to Moscow State University.",
      name: "Stalin’s ‘Seven Sisters’ skyscrapers, Moscow",
      role: "Developer from Russia",
      image: StalinsSevenSistersskyscrapersMoscow,
      imageSize: 300,
    },
    {
      text: "This is the most beautiful tsarist residence and a true symbol of the Imperial era. The splendid palace and the garden with its famous fountains were built by Peter the Great who planned to outdo Versaille. Well, even without visiting the French palace, Russians can tell you that Peter got his way!",
      name: "Peterhof, near St. Petersburg",
      role: "Developer from Russia",
      image: Peterhof_near_St_Petersburg,
      imageSize: 300,
    },
    {
      text: "This place is famous for two reasons - for housing the Hermitage Museum, which is Russia’s biggest museum with its huge collection of art that tsars and tsarinas started to gather in the 18th century. The second reason is the palace’s revolutionary significance - here was the Provisional Government that was arrested by the Bolsheviks in November 1917 (October according to the old calendar).",
      name: "The Winter Palace, St. Petersburg",
      role: "Developer from Russia",
      image: The_Winter_Palace_St_Petersburg,
      imageSize: 300,
    },
    {
      text: "Probably the most famous ship in Russian history, it saw action in World War I. But its most historic role came during the Bolshevik Revolution, when it fired a volley to signal the beginning of the storm of the Winter Palace. ",
      name: "The Aurora cruiser, St. Petersburg",
      role: "Developer from Russia",
      image: The_Aurora_cruiser_St_Petersburg,
      imageSize: 300,
    },
    {
      text: "Erected in 1782, the equestrian statue of Peter the Great stands on a huge stone that dates to prehistoric times. The monument is situated on Senate Square and is for sure one of the city’s main symbols. The statue got its ‘Bronze Horseman’ nickname thanks to Alexander Pushkin and his 1833 poem with the same title.",
      name: "The Bronze Horseman monument, St. Petersburg",
      role: "Developer from Russia",
      image: The_Bronze_Horseman_monument_St_Petersburg,
      imageSize: 300,
    },
    {
      text: "For sure this is the most instagrammable site in St. Petersburg, and the most romantic spectacle to watch as it happens late at night. While many bridges on the Neva River are raised, probably the most recognisable is the Palace Bridge.",
      name: "Rising drawbridges, St. Petersburg",
      role: "Developer from Russia",
      image: Rising_drawbridges_St_Petersburg,
      imageSize: 300,
    },
    {
      text: "The most western part of Russia, Kaliningrad, used to be a German city called Königsberg, but it became part of the Soviet Union after World War II. So the city has lots of relics of its German past. One of the most recognisable is the Königsberg Cathedral situated on the picturesque island that used to be called Kneiphof. Now the island is commonly known as Kant Island in honor of philosopher Immanuel Kant, whose grave is situated there.",
      name: "Kant Island, Kaliningrad",
      role: "Developer from Russia",
      image: Kant_Island_Kaliningrad,
      imageSize: 300,
    },
    {
      text: "This impressive World War II memorial is dedicated  to the Battle of Stalingrad (as the city was known before it was changed to Volgograd in 1961). This was one of the most brutal battles in history, with street by street fighting in fierce cold weather. Soviet troops defeated the Nazis, and it was the turning point in the war. ",
      name: "The ‘Motherland is Calling’ monument, Volgograd",
      role: "Developer from Russia",
      image: The_Motherland_is_Calling_monument_Volgograd,
      imageSize: 300,
    },
    {
      text: "This is a relatively new muslim mosque built in 2005, and it is now one of the largest mosques in Russia and Europe. Near to some Orthodox churches, the mosque is situated inside a kremlin in Kazan, the capital of the Russian republic of Tatarstan. Its construction highlights the links between Tatar and Russian cultures. ",
      name: "The Kul Sharif Mosque, Kazan",
      role: "Developer from Russia",
      image: The_Kul_Sharif_Mosque_Kazan,
      imageSize: 300,
    },
    {
      text: "The second Olympic Games in Russian history took place in Sochi in 2014. Beforehand people around the world poked fun about the fact that the Winter Olympics would be hosted in a subtropical area next to a Black Sea resort. However,  the perfectly arranged Games impressed people, and the Olympic Park with a sea view is now something that Russians take pride in.",
      name: "Olympic Park in Sochi, Krasnodar Territory",
      role: "Developer from Russia",
      image: The_Kul_Sharif_Mosque_Kazan,
      imageSize: 300,
    },
    {
      text: "The second Olympic Games in Russian history took place in Sochi in 2014. Beforehand people around the world poked fun about the fact that the Winter Olympics would be hosted in a subtropical area next to a Black Sea resort. However,  the perfectly arranged Games impressed people, and the Olympic Park with a sea view is now something that Russians take pride in.",
      name: "Olympic Park in Sochi, Krasnodar Territory",
      role: "Developer from Russia",
      image: Olympic_Park_in_Sochi_Krasnodar_Territory,
      imageSize: 300,
    },
    {
      text: "‘To see Baikal and die’ - this could be a Russian version of the famous phrase regarding Paris. Literally every Russian dreams of traveling to the world’s most unique lake. This is for sure one of the greatest natural wonders that we are incredibly proud of. ",
      name: "Lake Baikal, Siberia ",
      role: "Developer from Russia",
      image: Lake_Baikal_Siberia,
      imageSize: 300,
    },
    {
      text: "One of the most instagrammable places in Russia’s Far East, this picturesque lighthouse is separated from the mainland by a tiny path that is sometimes submerged by the water. By the way, it's one of the oldest lighthouses in Vladivostok, and was built in 1876 and still operates.",
      name: "Tokarev Lighthouse, Vladivostok",
      role: "Developer from Russia",
      image: Tokarev_Lighthouse_Vladivostok,
      imageSize: 300,
    },
    {
      text: "Scientists (not to mention ordinary Russians) can't say for sure how many volcanoes this Far East peninsula holds. However, for sure, there are more than a hundred. Of course, we don't know all their names, except probably the biggest one - Klyuchevskaya Sopka. But we know how beautiful (and a little) dangerous these volcanoes are... and we are proud that they are included in the UNESCO World Heritage list. ",
      name: "Kamchatka volcanoes",
      role: "Developer from Russia",
      image: Kamchatka_volcanoes,
      imageSize: 300,
    },
    {
      text: "The Rzhev Memorial to the Soviet Soldier is Russia’s newest monument devoted to World War II. It was erected in 2020 and commemorates those who fell in the little known Rzhev Battle. The impressive monument has a statue of a soldier whose coat symbolically turns into flying cranes. ",
      name: "Rzhev memorial, Tver Region",
      role: "Developer from Russia",
      image: Rzhev_memorial_Tver_Region,
      imageSize: 300,
    },
    {
      text: "This small castle in Crimea is a legend! Almost hanging off a cliff near Yalta, it is perfectly viewed from both water and land, and is the most popular postcard view of southern Crimea. Before the Revolution this house was owned by a Russian millionaire but then it was abandoned for many years. ",
      name: "The Swallow Nest, Crimea",
      role: "Developer from Russia",
      image: The_Swallow_Nest_Crimea,
      imageSize: 300,
    },
    {
      text: "This most anticipated bridge was constructed in 2018 and connected Krasnodar Territory and the Crimea peninsula. The bridge has both automobile and railway links, and it measures about 19 km in length, making it Russia’s longest bridge.",
      name: "Crimea Bridge",
      role: "Developer from Russia",
      image: Crimea_Bridge,
      imageSize: 300,
    },
  ]
  const testimonial = testimonials[Math.floor(Math.random() * 20)]
</script>

<div class="testimonial">
  <Layout noPadding gap="S">
    <img
      width={testimonial.imageSize}
      alt="a-happy-budibase-user"
      src={testimonial.image}
    />
    <div class="text">
      "{testimonial.text}"
    </div>
    <div class="author">
      <div class="name">{testimonial.name}</div>
      <div class="company">{testimonial.role}</div>
    </div>
  </Layout>
</div>

<style>
  .testimonial {
    width: 380px;
    padding: 40px;
  }
  .text {
    font-size: var(--font-size-l);
    font-style: italic;
  }
  .name {
    font-weight: bold;
    color: var(--spectrum-global-color-gray-900);
    font-size: var(--font-size-l);
  }
  .company {
    color: var(--spectrum-global-color-gray-700);
  }
</style>
