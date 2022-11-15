# GLog

This is a log parser for Grey You runs. You can use it to compare your most recent run to your average performance.

## Installation

To install the script, use the following command in the KoLMafia CLI.

```text
git checkout https://github.com/Kasekopf/glog.git release
```

## Usage

After your run is complete, use the following command to look at the performance of your most recent run, relative to the average performance of all your other runs this week:

```text
glog cutoff=1.5
```

This script takes about 10 seconds to run on my computer. The `cutoff` argument removes locations from the output where your current run was close to the average performance (in this case, within 1.5 turns of your average run).

Since parsing logs is expensive, if your most recent Grey You run is more than a week ago you may also need to provide the history argument. For example `glog cutoff=1.5 history=14` will look through the last two weeks instead, and take about twice as long to run.

## Sample Output

```text
> glog cutoff=1.5

Summary of Grey You run (vs. average of last 6 runs):
   The Penultimate Fantasy Airship: 35 (+8.67)
   The Castle in the Clouds in the Sky (Basement): 9 (+6.00)
   The Dark Heart of the Woods: 14 (+5.17)
   The Haunted Conservatory: 7 (+3.33)
   The Castle in the Clouds in the Sky (Top Floor): 8 (+3.33)
   The Haunted Ballroom: 7 (+3.00)
   The Haunted Bedroom: 8 (+2.83)
   The Haunted Gallery: 8 (+2.67)
   The Unquiet Garves: 4 (+2.33)
   Over Where the Old Tires Are: 4 (+1.83)
   The Skeleton Store: 3 (+1.83)
   The Hidden Hospital: 7 (+1.83)
   Out by that Rusted-Out Car: 4 (+1.67)
   The Dark Elbow of the Woods: 13 (+1.67)
   - removing entries with change <= 1.5 from average -
   The Outskirts of Cobb's Knob: 8 (-1.67)
   The Dungeons of Doom: 1 (-1.67)
   The Bandit Crossroads: 0 (-1.67)
   Wartime Hippy Camp (Frat Disguise): 3 (-2.00)
   Sonofa Beach: 1 (-2.00)
   The VERY Unquiet Garves: 0 (-2.17)
   The Hidden Apartment Building: 5 (-2.17)
   The Dark Neck of the Woods: 8 (-2.33)
   The Hole in the Sky: 1 (-2.50)
   The Enormous Greater-Than Sign: 3 (-3.00)
   Lair of the Ninja Snowmen: 3 (-4.00)
   The Valley of Rof L'm Fao: 2 (-4.00)
   The Spooky Forest: 10 (-4.17)
   Cake-Shaped Arena: 1 (-4.83)

Total turns spent as Grey You: 1129
   Non-farming turns: 570
   Adventures used at halt: 557 (+1.50)
   Adventures remaining at halt: 589 (-3.67)
```

## Advanced Usage

Run `glog help` for the full set of script options:

```text
> glog help

This is a script to analyze your Grey You log. Run "glog" without quotes to summarize your most recent run within the last week.

Options:
  history NUMBER - Number of days back to look for Grey You logs, including today. [default: 7] [setting: glog_history]
  run NUMBER - Look at the run that occured this many days ago, (0 meaning today, 1 meaning yesterday, etc.). If not given, look at your most recent run. [setting: glog_run]
  farming TEXT - Zones to exclude as part of in-ronin farming, comma-separated. [default: Barf Mountain] [setting: glog_farming]
  cutoff NUMBER - Only display diffs which are larger in magnitude than this number. [setting: glog_cutoff]
  help - Show this message and exit.
```
