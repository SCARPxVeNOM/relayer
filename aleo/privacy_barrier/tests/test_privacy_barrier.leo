// The 'test_privacy_barrier' test program.
import privacy_barrier.aleo;
program test_privacy_barrier.aleo {
    @test
    script test_it() {
        let result: u32 = privacy_barrier.aleo/main(1u32, 2u32);
        assert_eq(result, 3u32);
    }

    @test
    @should_fail
    transition do_nothing() {
        let result: u32 = privacy_barrier.aleo/main(2u32, 3u32);
        assert_eq(result, 3u32);
    }

    @noupgrade
    async constructor() {}
}
